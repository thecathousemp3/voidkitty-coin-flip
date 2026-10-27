#include <iostream>
#include <random>
#include <fstream>
#include <sstream>
#include <string>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#else
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>
#endif

static int flip_side() {
    static std::random_device entropy;
    static std::seed_seq seed{entropy(), entropy(), entropy(), entropy(),
                              entropy(), entropy(), entropy(), entropy()};
    static std::mt19937_64 engine(seed);
    static std::uniform_int_distribution<int> side(0, 1);
    return side(engine);
}

#ifdef _WIN32
using Socket = SOCKET;
static void close_socket(Socket socket) { closesocket(socket); }
#else
using Socket = int;
static void close_socket(Socket socket) { close(socket); }
#endif

static bool send_all(Socket socket, const std::string& data) {
    size_t sent = 0;
    while (sent < data.size()) {
#ifdef _WIN32
        const int count = send(socket, data.data() + sent, static_cast<int>(data.size() - sent), 0);
#else
        const auto count = send(socket, data.data() + sent, data.size() - sent, 0);
#endif
        if (count <= 0) return false;
        sent += static_cast<size_t>(count);
    }
    return true;
}

static std::string response(const std::string& status, const std::string& content_type,
                            const std::string& body) {
    return "HTTP/1.1 " + status + "\r\nContent-Type: " + content_type +
        "\r\nContent-Length: " + std::to_string(body.size()) +
        "\r\nConnection: close\r\nX-Content-Type-Options: nosniff\r\n\r\n" + body;
}

static std::string content_type(const std::string& path) {
    if (path.size() >= 4 && path.substr(path.size() - 4) == ".css") return "text/css; charset=utf-8";
    if (path.size() >= 3 && path.substr(path.size() - 3) == ".js") return "text/javascript; charset=utf-8";
    if (path.size() >= 5 && path.substr(path.size() - 5) == ".html") return "text/html; charset=utf-8";
    if (path.size() >= 4 && path.substr(path.size() - 4) == ".svg") return "image/svg+xml";
    return "application/octet-stream";
}

static std::string handle_request(const std::string& request) {
    const auto line_end = request.find("\r\n");
    if (line_end == std::string::npos) return response("400 Bad Request", "text/plain", "Bad Request");
    std::istringstream first_line(request.substr(0, line_end));
    std::string method, path, version;
    first_line >> method >> path >> version;

    if (method == "POST" && path == "/api/flip") {
        const std::string result = flip_side() == 0 ? "heads" : "tails";
        return response("200 OK", "application/json; charset=utf-8", "{\"result\":\"" + result + "\"}");
    }

    if (method != "GET") return response("405 Method Not Allowed", "text/plain", "Method Not Allowed");
    if (path == "/") path = "/index.html";
    if (path.find("..") != std::string::npos || path.find('\\') != std::string::npos ||
        path.find('%') != std::string::npos || (path != "/index.html" && path.rfind("/assets/", 0) != 0)) {
        return response("404 Not Found", "text/plain", "Not Found");
    }

    std::ifstream file("dist" + path, std::ios::binary);
    if (!file) return response("404 Not Found", "text/plain", "Not Found");
    std::ostringstream content;
    content << file.rdbuf();
    return response("200 OK", content_type(path), content.str());
}

int main() {
#ifdef _WIN32
    WSADATA data;
    if (WSAStartup(MAKEWORD(2, 2), &data) != 0) {
        std::cerr << "Could not initialize Windows networking.\n";
        return 1;
    }
#endif

    const Socket listener = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
#ifdef _WIN32
    if (listener == INVALID_SOCKET) {
#else
    if (listener < 0) {
#endif
        std::cerr << "Could not create the local HTTP server socket.\n";
        return 1;
    }

    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_port = htons(3000);
    inet_pton(AF_INET, "127.0.0.1", &address.sin_addr);
    if (bind(listener, reinterpret_cast<sockaddr*>(&address), sizeof(address)) != 0 ||
        listen(listener, 16) != 0) {
        std::cerr << "Could not listen on http://localhost:3000. Is the port already in use?\n";
        close_socket(listener);
#ifdef _WIN32
        WSACleanup();
#endif
        return 1;
    }

    std::cout << "Coin Flip (C++ backend) is running at http://localhost:3000\n";
    for (;;) {
        const Socket client = accept(listener, nullptr, nullptr);
#ifdef _WIN32
        if (client == INVALID_SOCKET) continue;
#else
        if (client < 0) continue;
#endif
        std::string request;
        char buffer[4096];
        size_t expected_size = 0;
        while (request.size() < 65536) {
#ifdef _WIN32
            const int count = recv(client, buffer, sizeof(buffer), 0);
#else
            const auto count = recv(client, buffer, sizeof(buffer), 0);
#endif
            if (count <= 0) break;
            request.append(buffer, static_cast<size_t>(count));
            const auto headers_end = request.find("\r\n\r\n");
            if (headers_end != std::string::npos) {
                expected_size = headers_end + 4;
                const auto length_pos = request.find("Content-Length:");
                if (length_pos != std::string::npos && length_pos < headers_end) {
                    const auto value_start = length_pos + 15;
                    const auto value_end = request.find("\r\n", value_start);
                    expected_size += static_cast<size_t>(std::stoul(request.substr(value_start, value_end - value_start)));
                }
                if (request.size() >= expected_size) break;
            }
        }
        send_all(client, handle_request(request));
        close_socket(client);
    }

#ifdef _WIN32
    WSACleanup();
#endif
    return 0;
}
