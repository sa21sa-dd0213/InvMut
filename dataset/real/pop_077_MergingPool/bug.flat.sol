// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library Address {

    function isContract(address account) internal view returns (bool) {

        return account.code.length > 0;
    }

    function sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Address: insufficient balance");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }

    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionCall(target, data, "Address: low-level call failed");
    }

    function functionCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0, errorMessage);
    }

    function functionCallWithValue(
        address target,
        bytes memory data,
        uint256 value
    ) internal returns (bytes memory) {
        return functionCallWithValue(target, data, value, "Address: low-level call with value failed");
    }

    function functionCallWithValue(
        address target,
        bytes memory data,
        uint256 value,
        string memory errorMessage
    ) internal returns (bytes memory) {
        require(address(this).balance >= value, "Address: insufficient balance for call");
        require(isContract(target), "Address: call to non-contract");

        (bool success, bytes memory returndata) = target.call{value: value}(data);
        return verifyCallResult(success, returndata, errorMessage);
    }

    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
        return functionStaticCall(target, data, "Address: low-level static call failed");
    }

    function functionStaticCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal view returns (bytes memory) {
        require(isContract(target), "Address: static call to non-contract");

        (bool success, bytes memory returndata) = target.staticcall(data);
        return verifyCallResult(success, returndata, errorMessage);
    }

    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionDelegateCall(target, data, "Address: low-level delegate call failed");
    }

    function functionDelegateCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal returns (bytes memory) {
        require(isContract(target), "Address: delegate call to non-contract");

        (bool success, bytes memory returndata) = target.delegatecall(data);
        return verifyCallResult(success, returndata, errorMessage);
    }

    function verifyCallResult(
        bool success,
        bytes memory returndata,
        string memory errorMessage
    ) internal pure returns (bytes memory) {
        if (success) {
            return returndata;
        } else {

            if (returndata.length > 0) {

                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert(errorMessage);
            }
        }
    }
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

library FighterOps {

    event FighterCreated(
        uint256 id,
        uint256 weight,
        uint256 element,
        uint8 generation
    );

    struct FighterPhysicalAttributes {
        uint256 head;
        uint256 eyes;
        uint256 mouth;
        uint256 body;
        uint256 hands;
        uint256 feet;
    }

    struct Fighter {
        uint256 weight;
        uint256 element;
        FighterPhysicalAttributes physicalAttributes;
        uint256 id;
        string modelHash;
        string modelType;
        uint8 generation;
        uint8 iconsType;
        bool dendroidBool;
    }

    function fighterCreatedEmitter(
        uint256 id,
        uint256 weight,
        uint256 element,
        uint8 generation
    )
        public
    {
        emit FighterCreated(id, weight, element, generation);
    }

    function getFighterAttributes(Fighter storage self) public view returns (uint256[6] memory) {
        return [
            self.physicalAttributes.head,
            self.physicalAttributes.eyes,
            self.physicalAttributes.mouth,
            self.physicalAttributes.body,
            self.physicalAttributes.hands,
            self.physicalAttributes.feet
        ];
    }

    function viewFighterInfo(
        Fighter storage self,
        address owner
    )
        public
        view
        returns (
            address,
            uint256[6] memory,
            uint256,
            uint256,
            string memory,
            string memory,
            uint16
        )
    {
        return (
            owner,
            getFighterAttributes(self),
            self.weight,
            self.element,
            self.modelHash,
            self.modelType,
            self.generation
        );
    }
}

interface IAccessControl {

    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    function hasRole(bytes32 role, address account) external view returns (bool);

    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    function grantRole(bytes32 role, address account) external;

    function revokeRole(bytes32 role, address account) external;

    function renounceRole(bytes32 role, address account) external;
}

interface IERC165 {

    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC20 {

    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

interface IERC721Receiver {

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

library Strings {
    bytes16 private constant _HEX_SYMBOLS = "0123456789abcdef";
    uint8 private constant _ADDRESS_LENGTH = 20;

    function toString(uint256 value) internal pure returns (string memory) {

        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function toHexString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0x00";
        }
        uint256 temp = value;
        uint256 length = 0;
        while (temp != 0) {
            length++;
            temp >>= 8;
        }
        return toHexString(value, length);
    }

    function toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
        bytes memory buffer = new bytes(2 * length + 2);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 2 * length + 1; i > 1; --i) {
            buffer[i] = _HEX_SYMBOLS[value & 0xf];
            value >>= 4;
        }
        require(value == 0, "Strings: hex length insufficient");
        return string(buffer);
    }

    function toHexString(address addr) internal pure returns (string memory) {
        return toHexString(uint256(uint160(addr)), _ADDRESS_LENGTH);
    }
}

library Verification {

    function verify(
        bytes32 msgHash,
        bytes memory signature,
        address signer
    )
        public
        pure
        returns(bool)
    {
        require(signature.length == 65, "invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {

            r := mload(add(signature, 32))

            s := mload(add(signature, 64))

            v := byte(0, mload(add(signature, 96)))
        }
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, msgHash));
        return ecrecover(prefixedHash, v, r, s) == signer;
    }
}

contract AiArenaHelper {

    string[] public attributes = ["head", "eyes", "mouth", "body", "hands", "feet"];

    uint8[] public defaultAttributeDivisor = [2, 3, 5, 7, 11, 13];

    address _ownerAddress;

    mapping(uint256 => mapping(string => uint8[])) public attributeProbabilities;

    mapping(string => uint8) public attributeToDnaDivisor;

    constructor(uint8[][] memory probabilities) {
        _ownerAddress = msg.sender;

        addAttributeProbabilities(0, probabilities);

        uint256 attributesLength = attributes.length;
        for (uint8 i = 0; i < attributesLength; i++) {
            attributeProbabilities[0][attributes[i]] = probabilities[i];
            attributeToDnaDivisor[attributes[i]] = defaultAttributeDivisor[i];
        }
    }

    function transferOwnership(address newOwnerAddress) external {
        require(msg.sender == _ownerAddress);
        _ownerAddress = newOwnerAddress;
    }

    function addAttributeDivisor(uint8[] memory attributeDivisors) external {
        require(msg.sender == _ownerAddress);
        require(attributeDivisors.length == attributes.length);

        uint256 attributesLength = attributes.length;
        for (uint8 i = 0; i < attributesLength; i++) {
            attributeToDnaDivisor[attributes[i]] = attributeDivisors[i];
        }
    }

    function createPhysicalAttributes(
        uint256 dna,
        uint8 generation,
        uint8 iconsType,
        bool dendroidBool
    )
        external
        view
        returns (FighterOps.FighterPhysicalAttributes memory)
    {
        if (dendroidBool) {
            return FighterOps.FighterPhysicalAttributes(99, 99, 99, 99, 99, 99);
        } else {
            uint256[] memory finalAttributeProbabilityIndexes = new uint[](attributes.length);

            uint256 attributesLength = attributes.length;
            for (uint8 i = 0; i < attributesLength; i++) {
                if (
                  i == 0 && iconsType == 2 ||
                  i == 1 && iconsType > 0 ||
                  i == 4 && iconsType == 3
                ) {
                    finalAttributeProbabilityIndexes[i] = 50;
                } else {
                    uint256 rarityRank = (dna / attributeToDnaDivisor[attributes[i]]) % 100;
                    uint256 attributeIndex = dnaToIndex(generation, rarityRank, attributes[i]);
                    finalAttributeProbabilityIndexes[i] = attributeIndex;
                }
            }
            return FighterOps.FighterPhysicalAttributes(
                finalAttributeProbabilityIndexes[0],
                finalAttributeProbabilityIndexes[1],
                finalAttributeProbabilityIndexes[2],
                finalAttributeProbabilityIndexes[3],
                finalAttributeProbabilityIndexes[4],
                finalAttributeProbabilityIndexes[5]
            );
        }
    }

    function addAttributeProbabilities(uint256 generation, uint8[][] memory probabilities) public {
        require(msg.sender == _ownerAddress);
        require(probabilities.length == 6, "Invalid number of attribute arrays");

        uint256 attributesLength = attributes.length;
        for (uint8 i = 0; i < attributesLength; i++) {
            attributeProbabilities[generation][attributes[i]] = probabilities[i];
        }
    }

    function deleteAttributeProbabilities(uint8 generation) public {
        require(msg.sender == _ownerAddress);

        uint256 attributesLength = attributes.length;
        for (uint8 i = 0; i < attributesLength; i++) {
            attributeProbabilities[generation][attributes[i]] = new uint8[](0);
        }
    }

    function getAttributeProbabilities(uint256 generation, string memory attribute)
        public
        view
        returns (uint8[] memory)
    {
        return attributeProbabilities[generation][attribute];
    }

    function dnaToIndex(uint256 generation, uint256 rarityRank, string memory attribute)
        public
        view
        returns (uint256 attributeProbabilityIndex)
    {
        uint8[] memory attrProbabilities = getAttributeProbabilities(generation, attribute);

        uint256 cumProb = 0;
        uint256 attrProbabilitiesLength = attrProbabilities.length;
        for (uint8 i = 0; i < attrProbabilitiesLength; i++) {
            cumProb += attrProbabilities[i];
            if (cumProb >= rarityRank) {
                attributeProbabilityIndex = i + 1;
                break;
            }
        }
        return attributeProbabilityIndex;
    }
}

abstract contract ERC165 is IERC165 {

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}

interface IERC20Metadata is IERC20 {

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);
}

interface IERC721 is IERC165 {

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function balanceOf(address owner) external view returns (uint256 balance);

    function ownerOf(uint256 tokenId) external view returns (address owner);

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external;

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;

    function approve(address to, uint256 tokenId) external;

    function setApprovalForAll(address operator, bool _approved) external;

    function getApproved(uint256 tokenId) external view returns (address operator);

    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

interface IERC721Enumerable is IERC721 {

    function totalSupply() external view returns (uint256);

    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);

    function tokenByIndex(uint256 index) external view returns (uint256);
}

interface IERC721Metadata is IERC721 {

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function tokenURI(uint256 tokenId) external view returns (string memory);
}

contract ERC20 is Context, IERC20, IERC20Metadata {
    mapping(address => uint256) private _balances;

    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, amount);
        return true;
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, allowance(owner, spender) + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        address owner = _msgSender();
        uint256 currentAllowance = allowance(owner, spender);
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        unchecked {
            _approve(owner, spender, currentAllowance - subtractedValue);
        }

        return true;
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        _beforeTokenTransfer(from, to, amount);

        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked {
            _balances[from] = fromBalance - amount;
        }
        _balances[to] += amount;

        emit Transfer(from, to, amount);

        _afterTokenTransfer(from, to, amount);
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), account, amount);

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);

        _afterTokenTransfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
        }
        _totalSupply -= amount;

        emit Transfer(account, address(0), amount);

        _afterTokenTransfer(account, address(0), amount);
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _spendAllowance(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}
}

abstract contract AccessControl is Context, IAccessControl, ERC165 {
    struct RoleData {
        mapping(address => bool) members;
        bytes32 adminRole;
    }

    mapping(bytes32 => RoleData) private _roles;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IAccessControl).interfaceId || super.supportsInterface(interfaceId);
    }

    function hasRole(bytes32 role, address account) public view virtual override returns (bool) {
        return _roles[role].members[account];
    }

    function _checkRole(bytes32 role) internal view virtual {
        _checkRole(role, _msgSender());
    }

    function _checkRole(bytes32 role, address account) internal view virtual {
        if (!hasRole(role, account)) {
            revert(
                string(
                    abi.encodePacked(
                        "AccessControl: account ",
                        Strings.toHexString(uint160(account), 20),
                        " is missing role ",
                        Strings.toHexString(uint256(role), 32)
                    )
                )
            );
        }
    }

    function getRoleAdmin(bytes32 role) public view virtual override returns (bytes32) {
        return _roles[role].adminRole;
    }

    function grantRole(bytes32 role, address account) public virtual override onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public virtual override onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }

    function renounceRole(bytes32 role, address account) public virtual override {
        require(account == _msgSender(), "AccessControl: can only renounce roles for self");

        _revokeRole(role, account);
    }

    function _setupRole(bytes32 role, address account) internal virtual {
        _grantRole(role, account);
    }

    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
        bytes32 previousAdminRole = getRoleAdmin(role);
        _roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    function _grantRole(bytes32 role, address account) internal virtual {
        if (!hasRole(role, account)) {
            _roles[role].members[account] = true;
            emit RoleGranted(role, account, _msgSender());
        }
    }

    function _revokeRole(bytes32 role, address account) internal virtual {
        if (hasRole(role, account)) {
            _roles[role].members[account] = false;
            emit RoleRevoked(role, account, _msgSender());
        }
    }
}

contract ERC721 is Context, ERC165, IERC721, IERC721Metadata {
    using Address for address;
    using Strings for uint256;

    string private _name;

    string private _symbol;

    mapping(uint256 => address) private _owners;

    mapping(address => uint256) private _balances;

    mapping(uint256 => address) private _tokenApprovals;

    mapping(address => mapping(address => bool)) private _operatorApprovals;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function balanceOf(address owner) public view virtual override returns (uint256) {
        require(owner != address(0), "ERC721: address zero is not a valid owner");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view virtual override returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ERC721: invalid token ID");
        return owner;
    }

    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireMinted(tokenId);

        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString())) : "";
    }

    function _baseURI() internal view virtual returns (string memory) {
        return "";
    }

    function approve(address to, uint256 tokenId) public virtual override {
        address owner = ERC721.ownerOf(tokenId);
        require(to != owner, "ERC721: approval to current owner");

        require(
            _msgSender() == owner || isApprovedForAll(owner, _msgSender()),
            "ERC721: approve caller is not token owner nor approved for all"
        );

        _approve(to, tokenId);
    }

    function getApproved(uint256 tokenId) public view virtual override returns (address) {
        _requireMinted(tokenId);

        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) public virtual override {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view virtual override returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {

        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: caller is not token owner nor approved");

        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: caller is not token owner nor approved");
        _safeTransfer(from, to, tokenId, data);
    }

    function _safeTransfer(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal virtual {
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "ERC721: transfer to non ERC721Receiver implementer");
    }

    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return _owners[tokenId] != address(0);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view virtual returns (bool) {
        address owner = ERC721.ownerOf(tokenId);
        return (spender == owner || isApprovedForAll(owner, spender) || getApproved(tokenId) == spender);
    }

    function _safeMint(address to, uint256 tokenId) internal virtual {
        _safeMint(to, tokenId, "");
    }

    function _safeMint(
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal virtual {
        _mint(to, tokenId);
        require(
            _checkOnERC721Received(address(0), to, tokenId, data),
            "ERC721: transfer to non ERC721Receiver implementer"
        );
    }

    function _mint(address to, uint256 tokenId) internal virtual {
        require(to != address(0), "ERC721: mint to the zero address");
        require(!_exists(tokenId), "ERC721: token already minted");

        _beforeTokenTransfer(address(0), to, tokenId);

        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);

        _afterTokenTransfer(address(0), to, tokenId);
    }

    function _burn(uint256 tokenId) internal virtual {
        address owner = ERC721.ownerOf(tokenId);

        _beforeTokenTransfer(owner, address(0), tokenId);

        _approve(address(0), tokenId);

        _balances[owner] -= 1;
        delete _owners[tokenId];

        emit Transfer(owner, address(0), tokenId);

        _afterTokenTransfer(owner, address(0), tokenId);
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {
        require(ERC721.ownerOf(tokenId) == from, "ERC721: transfer from incorrect owner");
        require(to != address(0), "ERC721: transfer to the zero address");

        _beforeTokenTransfer(from, to, tokenId);

        _approve(address(0), tokenId);

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);

        _afterTokenTransfer(from, to, tokenId);
    }

    function _approve(address to, uint256 tokenId) internal virtual {
        _tokenApprovals[tokenId] = to;
        emit Approval(ERC721.ownerOf(tokenId), to, tokenId);
    }

    function _setApprovalForAll(
        address owner,
        address operator,
        bool approved
    ) internal virtual {
        require(owner != operator, "ERC721: approve to caller");
        _operatorApprovals[owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
    }

    function _requireMinted(uint256 tokenId) internal view virtual {
        require(_exists(tokenId), "ERC721: invalid token ID");
    }

    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private returns (bool) {
        if (to.isContract()) {
            try IERC721Receiver(to).onERC721Received(_msgSender(), from, tokenId, data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC721: transfer to non ERC721Receiver implementer");
                } else {

                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {}

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {}
}

abstract contract ERC721Burnable is Context, ERC721 {

    function burn(uint256 tokenId) public virtual {

        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: caller is not token owner nor approved");
        _burn(tokenId);
    }
}

contract Neuron is ERC20, AccessControl {

    event TokensClaimed(address user, uint256 amount);

    event TokensMinted(address user, uint256 amount);

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    bytes32 public constant SPENDER_ROLE = keccak256("SPENDER_ROLE");

    bytes32 public constant STAKER_ROLE = keccak256("STAKER_ROLE");

    uint256 public constant INITIAL_TREASURY_MINT = 10**18 * 10**8 * 2;

    uint256 public constant INITIAL_CONTRIBUTOR_MINT = 10**18 * 10**8 * 5;

    uint256 public constant MAX_SUPPLY = 10**18 * 10**9;

    address public treasuryAddress;

    address _ownerAddress;

    mapping(address => bool) public isAdmin;

    constructor(address ownerAddress, address treasuryAddress_, address contributorAddress)
        ERC20("Neuron", "NRN")
    {
        _ownerAddress = ownerAddress;
        treasuryAddress = treasuryAddress_;
        isAdmin[_ownerAddress] = true;
        _mint(treasuryAddress, INITIAL_TREASURY_MINT);
        _mint(contributorAddress, INITIAL_CONTRIBUTOR_MINT);
    }

    function transferOwnership(address newOwnerAddress) external {
        require(msg.sender == _ownerAddress);
        _ownerAddress = newOwnerAddress;
    }

    function addMinter(address newMinterAddress) external {
        require(msg.sender == _ownerAddress);
        _setupRole(MINTER_ROLE, newMinterAddress);
    }

    function addStaker(address newStakerAddress) external {
        require(msg.sender == _ownerAddress);
        _setupRole(STAKER_ROLE, newStakerAddress);
    }

    function addSpender(address newSpenderAddress) external {
        require(msg.sender == _ownerAddress);
        _setupRole(SPENDER_ROLE, newSpenderAddress);
    }

    function adjustAdminAccess(address adminAddress, bool access) external {
        require(msg.sender == _ownerAddress);
        isAdmin[adminAddress] = access;
    }

    function setupAirdrop(address[] calldata recipients, uint256[] calldata amounts) external {
        require(isAdmin[msg.sender]);
        require(recipients.length == amounts.length);
        uint256 recipientsLength = recipients.length;
        for (uint32 i = 0; i < recipientsLength; i++) {
            _approve(treasuryAddress, recipients[i], amounts[i]);
        }
    }

    function claim(uint256 amount) external {
        require(
            allowance(treasuryAddress, msg.sender) >= amount,
            "ERC20: claim amount exceeds allowance"
        );
        transferFrom(treasuryAddress, msg.sender, amount);
        emit TokensClaimed(msg.sender, amount);
    }

    function mint(address to, uint256 amount) public virtual {
        require(totalSupply() + amount < MAX_SUPPLY, "Trying to mint more than the max supply");
        require(hasRole(MINTER_ROLE, msg.sender), "ERC20: must have minter role to mint");
        _mint(to, amount);
    }

    function burn(uint256 amount) public virtual {
        _burn(msg.sender, amount);
    }

    function approveSpender(address account, uint256 amount) public {
        require(
            hasRole(SPENDER_ROLE, msg.sender),
            "ERC20: must have spender role to approve spending"
        );
        _approve(account, msg.sender, amount);
    }

    function approveStaker(address owner, address spender, uint256 amount) public {
        require(
            hasRole(STAKER_ROLE, msg.sender),
            "ERC20: must have staker role to approve staking"
        );
        _approve(owner, spender, amount);
    }

    function burnFrom(address account, uint256 amount) public virtual {
        require(
            allowance(account, msg.sender) >= amount,
            "ERC20: burn amount exceeds allowance"
        );
        uint256 decreasedAllowance = allowance(account, msg.sender) - amount;
        _burn(account, amount);
        _approve(account, msg.sender, decreasedAllowance);
    }

}

abstract contract ERC721Enumerable is ERC721, IERC721Enumerable {

    mapping(address => mapping(uint256 => uint256)) private _ownedTokens;

    mapping(uint256 => uint256) private _ownedTokensIndex;

    uint256[] private _allTokens;

    mapping(uint256 => uint256) private _allTokensIndex;

    function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165, ERC721) returns (bool) {
        return interfaceId == type(IERC721Enumerable).interfaceId || super.supportsInterface(interfaceId);
    }

    function tokenOfOwnerByIndex(address owner, uint256 index) public view virtual override returns (uint256) {
        require(index < ERC721.balanceOf(owner), "ERC721Enumerable: owner index out of bounds");
        return _ownedTokens[owner][index];
    }

    function totalSupply() public view virtual override returns (uint256) {
        return _allTokens.length;
    }

    function tokenByIndex(uint256 index) public view virtual override returns (uint256) {
        require(index < ERC721Enumerable.totalSupply(), "ERC721Enumerable: global index out of bounds");
        return _allTokens[index];
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId);

        if (from == address(0)) {
            _addTokenToAllTokensEnumeration(tokenId);
        } else if (from != to) {
            _removeTokenFromOwnerEnumeration(from, tokenId);
        }
        if (to == address(0)) {
            _removeTokenFromAllTokensEnumeration(tokenId);
        } else if (to != from) {
            _addTokenToOwnerEnumeration(to, tokenId);
        }
    }

    function _addTokenToOwnerEnumeration(address to, uint256 tokenId) private {
        uint256 length = ERC721.balanceOf(to);
        _ownedTokens[to][length] = tokenId;
        _ownedTokensIndex[tokenId] = length;
    }

    function _addTokenToAllTokensEnumeration(uint256 tokenId) private {
        _allTokensIndex[tokenId] = _allTokens.length;
        _allTokens.push(tokenId);
    }

    function _removeTokenFromOwnerEnumeration(address from, uint256 tokenId) private {

        uint256 lastTokenIndex = ERC721.balanceOf(from) - 1;
        uint256 tokenIndex = _ownedTokensIndex[tokenId];

        if (tokenIndex != lastTokenIndex) {
            uint256 lastTokenId = _ownedTokens[from][lastTokenIndex];

            _ownedTokens[from][tokenIndex] = lastTokenId;
            _ownedTokensIndex[lastTokenId] = tokenIndex;
        }

        delete _ownedTokensIndex[tokenId];
        delete _ownedTokens[from][lastTokenIndex];
    }

    function _removeTokenFromAllTokensEnumeration(uint256 tokenId) private {

        uint256 lastTokenIndex = _allTokens.length - 1;
        uint256 tokenIndex = _allTokensIndex[tokenId];

        uint256 lastTokenId = _allTokens[lastTokenIndex];

        _allTokens[tokenIndex] = lastTokenId;
        _allTokensIndex[lastTokenId] = tokenIndex;

        delete _allTokensIndex[tokenId];
        _allTokens.pop();
    }
}

contract AAMintPass is ERC721, ERC721Burnable {

    address public founderAddress;

    address public fighterFarmContractAddress;

    address public delegatedAddress;

    mapping(address => bool) public isAdmin;

    mapping(uint256 => string) private tokenURIs;

    mapping(address => mapping(uint8 => uint8)) public passesClaimed;

    bool public mintingPaused = true;

    uint256 public numTokensOutstanding = 0;

    uint256 public numTokensBurned = 0;

    constructor(address _founderAddress, address _delegatedAddress)
        ERC721("AI Arena Mint Pass", "AAMP")
    {
        delegatedAddress = _delegatedAddress;
        founderAddress = _founderAddress;
        isAdmin[founderAddress] = true;
    }

    function transferOwnership(address _newFounderAddress) external {
        require(msg.sender == founderAddress);
        isAdmin[founderAddress] = false;
        founderAddress = _newFounderAddress;
        isAdmin[_newFounderAddress] = true;
    }

    function addAdmin(address _newAdmin) external {
        require(msg.sender == founderAddress);
        isAdmin[_newAdmin] = true;
    }

    function removeAdmin(address adminAddress) external {
        require(msg.sender == founderAddress);
        isAdmin[adminAddress] = false;
    }

    function setFighterFarmAddress(address _fighterFarmAddress) external {
        require(msg.sender == founderAddress);
        fighterFarmContractAddress = _fighterFarmAddress;
    }

    function setDelegatedAddress(address _delegatedAddress) external {
        require(msg.sender == founderAddress);
        delegatedAddress = _delegatedAddress;
    }

    function setPaused(bool _state) external {
        require(isAdmin[msg.sender]);
        mintingPaused = _state;
    }

    function claimMintPass(
        uint8[2] calldata numToMint,
        bytes calldata signature,
        string[] calldata _tokenURIs
    )
        external
    {
        require(!mintingPaused);
        bytes32 msgHash = bytes32(keccak256(abi.encode(
            msg.sender,
            numToMint[0],
            numToMint[1],
            passesClaimed[msg.sender][0],
            passesClaimed[msg.sender][1],
            _tokenURIs
        )));
        require(Verification.verify(msgHash, signature, delegatedAddress));
        uint16 totalToMint = uint16(numToMint[0] + numToMint[1]);
        require(_tokenURIs.length == totalToMint);
        passesClaimed[msg.sender][0] += numToMint[0];
        passesClaimed[msg.sender][1] += numToMint[1];
        for (uint16 i = 0; i < totalToMint; i++) {
            createMintPass(msg.sender, _tokenURIs[i]);
        }
    }

    function burn(uint256 _tokenId) public override {
        require(msg.sender == fighterFarmContractAddress || msg.sender == ownerOf(_tokenId));
        numTokensBurned++;
        numTokensOutstanding--;
        super.burn(_tokenId);
    }

    function totalSupply() public view returns (uint256) {
        return numTokensOutstanding;
    }

    function contractURI() public pure returns (string memory) {
        return "ipfs://bafybeifdvzwsjpxrkbyhqpz3y57j7nwm3eyyc3feqppqggslea3g5kk3jq";
    }

    function tokenURI(uint256 _tokenId) public view override(ERC721) returns (string memory) {
        require(_exists(_tokenId), "ERC721Metadata: URI query for nonexistent token");
        return tokenURIs[_tokenId];
    }

    function createMintPass(address _receiver, string calldata _tokenURI) private {
        numTokensOutstanding++;
        uint256 tokenId = numTokensOutstanding + numTokensBurned;
        tokenURIs[tokenId] = _tokenURI;
        _safeMint(_receiver, tokenId);
    }
}

contract FighterFarm is ERC721, ERC721Enumerable {

    event Locked(uint256 tokenId);

    event Unlocked(uint256 tokenId);

    uint8 public constant MAX_FIGHTERS_ALLOWED = 10;

    uint8[2] public maxRerollsAllowed = [3, 3];

    uint256 public rerollCost = 1000 * 10**18;

    uint8[2] public generation = [0, 0];

    uint32 public totalNumTrained;

    address public treasuryAddress;

    address _ownerAddress;

    address _delegatedAddress;

    address _mergingPoolAddress;

    AiArenaHelper _aiArenaHelperInstance;

    AAMintPass _mintpassInstance;

    Neuron _neuronInstance;

    FighterOps.Fighter[] public fighters;

    mapping(uint256 => bool) public fighterStaked;

    mapping(uint256 => uint8) public numRerolls;

    mapping(address => bool) public hasStakerRole;

    mapping(uint8 => uint8) public numElements;

    mapping(address => mapping(uint8 => uint8)) public nftsClaimed;

    mapping(uint256 => uint32) public numTrained;

    mapping(uint256 => string) private _tokenURIs;

    constructor(address ownerAddress, address delegatedAddress, address treasuryAddress_)
        ERC721("AI Arena Fighter", "FTR")
    {
        _ownerAddress = ownerAddress;
        _delegatedAddress = delegatedAddress;
        treasuryAddress = treasuryAddress_;
        numElements[0] = 3;
    }

    function transferOwnership(address newOwnerAddress) external {
        require(msg.sender == _ownerAddress);
        _ownerAddress = newOwnerAddress;
    }

    function incrementGeneration(uint8 fighterType) external returns (uint8) {
        require(msg.sender == _ownerAddress);
        generation[fighterType] += 1;
        maxRerollsAllowed[fighterType] += 1;
        return generation[fighterType];
    }

    function addStaker(address newStaker) external {
        require(msg.sender == _ownerAddress);
        hasStakerRole[newStaker] = true;
    }

    function instantiateAIArenaHelperContract(address aiArenaHelperAddress) external {
        require(msg.sender == _ownerAddress);
        _aiArenaHelperInstance = AiArenaHelper(aiArenaHelperAddress);
    }

    function instantiateMintpassContract(address mintpassAddress) external {
        require(msg.sender == _ownerAddress);
        _mintpassInstance = AAMintPass(mintpassAddress);
    }

    function instantiateNeuronContract(address neuronAddress) external {
        require(msg.sender == _ownerAddress);
        _neuronInstance = Neuron(neuronAddress);
    }

    function setMergingPoolAddress(address mergingPoolAddress) external {
        require(msg.sender == _ownerAddress);
        _mergingPoolAddress = mergingPoolAddress;
    }

    function setTokenURI(uint256 tokenId, string calldata newTokenURI) external {
        require(msg.sender == _delegatedAddress);
        _tokenURIs[tokenId] = newTokenURI;
    }

    function claimFighters(
        uint8[2] calldata numToMint,
        bytes calldata signature,
        string[] calldata modelHashes,
        string[] calldata modelTypes
    )
        external
    {
        bytes32 msgHash = bytes32(keccak256(abi.encode(
            msg.sender,
            numToMint[0],
            numToMint[1],
            nftsClaimed[msg.sender][0],
            nftsClaimed[msg.sender][1]
        )));
        require(Verification.verify(msgHash, signature, _delegatedAddress));
        uint16 totalToMint = uint16(numToMint[0] + numToMint[1]);
        require(modelHashes.length == totalToMint && modelTypes.length == totalToMint);
        nftsClaimed[msg.sender][0] += numToMint[0];
        nftsClaimed[msg.sender][1] += numToMint[1];
        for (uint16 i = 0; i < totalToMint; i++) {
            _createNewFighter(
                msg.sender,
                uint256(keccak256(abi.encode(msg.sender, fighters.length))),
                modelHashes[i],
                modelTypes[i],
                i < numToMint[0] ? 0 : 1,
                0,
                [uint256(100), uint256(100)]
            );
        }
    }

    function redeemMintPass(
        uint256[] calldata mintpassIdsToBurn,
        uint8[] calldata fighterTypes,
        uint8[] calldata iconsTypes,
        string[] calldata mintPassDnas,
        string[] calldata modelHashes,
        string[] calldata modelTypes
    )
        external
    {
        require(
            mintpassIdsToBurn.length == mintPassDnas.length &&
            mintPassDnas.length == fighterTypes.length &&
            fighterTypes.length == modelHashes.length &&
            modelHashes.length == modelTypes.length
        );
        for (uint16 i = 0; i < mintpassIdsToBurn.length; i++) {
            require(msg.sender == _mintpassInstance.ownerOf(mintpassIdsToBurn[i]));
            _mintpassInstance.burn(mintpassIdsToBurn[i]);
            _createNewFighter(
                msg.sender,
                uint256(keccak256(abi.encode(mintPassDnas[i]))),
                modelHashes[i],
                modelTypes[i],
                fighterTypes[i],
                iconsTypes[i],
                [uint256(100), uint256(100)]
            );
        }
    }

    function updateFighterStaking(uint256 tokenId, bool stakingStatus) external {
        require(hasStakerRole[msg.sender]);
        fighterStaked[tokenId] = stakingStatus;
        if (stakingStatus) {
            emit Locked(tokenId);
        } else {
            emit Unlocked(tokenId);
        }
    }

    function updateModel(
        uint256 tokenId,
        string calldata modelHash,
        string calldata modelType
    )
        external
    {
        require(msg.sender == ownerOf(tokenId));
        fighters[tokenId].modelHash = modelHash;
        fighters[tokenId].modelType = modelType;
        numTrained[tokenId] += 1;
        totalNumTrained += 1;
    }

    function doesTokenExist(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId);
    }

    function mintFromMergingPool(
        address to,
        string calldata modelHash,
        string calldata modelType,
        uint256[2] calldata customAttributes
    )
        public
    {
        require(msg.sender == _mergingPoolAddress);
        _createNewFighter(
            to,
            uint256(keccak256(abi.encode(msg.sender, fighters.length))),
            modelHash,
            modelType,
            0,
            0,
            customAttributes
        );
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    )
        public
        override(ERC721, IERC721)
    {
        require(_ableToTransfer(tokenId, to));
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    )
        public
        override(ERC721, IERC721)
    {
        require(_ableToTransfer(tokenId, to));
        _safeTransfer(from, to, tokenId, "");
    }

    function reRoll(uint8 tokenId, uint8 fighterType) public {
        require(msg.sender == ownerOf(tokenId));
        require(numRerolls[tokenId] < maxRerollsAllowed[fighterType]);
        require(_neuronInstance.balanceOf(msg.sender) >= rerollCost, "Not enough NRN for reroll");

        _neuronInstance.approveSpender(msg.sender, rerollCost);
        bool success = _neuronInstance.transferFrom(msg.sender, treasuryAddress, rerollCost);
        if (success) {
            numRerolls[tokenId] += 1;
            uint256 dna = uint256(keccak256(abi.encode(msg.sender, tokenId, numRerolls[tokenId])));
            (uint256 element, uint256 weight, uint256 newDna) = _createFighterBase(dna, fighterType);
            fighters[tokenId].element = element;
            fighters[tokenId].weight = weight;
            fighters[tokenId].physicalAttributes = _aiArenaHelperInstance.createPhysicalAttributes(
                newDna,
                generation[fighterType],
                fighters[tokenId].iconsType,
                fighters[tokenId].dendroidBool
            );
            _tokenURIs[tokenId] = "";
        }
    }

    function contractURI() public pure returns (string memory) {
        return "ipfs://bafybeifztjs4yuwhqi7bvzhw2ufksynkoiwxss2gnti6j4v25l7iwz7y44";
    }

    function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory) {
        return _tokenURIs[tokenId];
    }

    function supportsInterface(bytes4 _interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(_interfaceId);
    }

    function getAllFighterInfo(
        uint256 tokenId
    )
        public
        view
        returns (
            address,
            uint256[6] memory,
            uint256,
            uint256,
            string memory,
            string memory,
            uint16
        )
    {
        return FighterOps.viewFighterInfo(fighters[tokenId], ownerOf(tokenId));
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _createFighterBase(
        uint256 dna,
        uint8 fighterType
    )
        private
        view
        returns (uint256, uint256, uint256)
    {
        uint256 element = dna % numElements[generation[fighterType]];
        uint256 weight = dna % 31 + 65;
        uint256 newDna = fighterType == 0 ? dna : uint256(fighterType);
        return (element, weight, newDna);
    }

    function _createNewFighter(
        address to,
        uint256 dna,
        string memory modelHash,
        string memory modelType,
        uint8 fighterType,
        uint8 iconsType,
        uint256[2] memory customAttributes
    )
        private
    {
        require(balanceOf(to) < MAX_FIGHTERS_ALLOWED);
        uint256 element;
        uint256 weight;
        uint256 newDna;
        if (customAttributes[0] == 100) {
            (element, weight, newDna) = _createFighterBase(dna, fighterType);
        }
        else {
            element = customAttributes[0];
            weight = customAttributes[1];
            newDna = dna;
        }
        uint256 newId = fighters.length;

        bool dendroidBool = fighterType == 1;
        FighterOps.FighterPhysicalAttributes memory attrs = _aiArenaHelperInstance.createPhysicalAttributes(
            newDna,
            generation[fighterType],
            iconsType,
            dendroidBool
        );
        fighters.push(
            FighterOps.Fighter(
                weight,
                element,
                attrs,
                newId,
                modelHash,
                modelType,
                generation[fighterType],
                iconsType,
                dendroidBool
            )
        );
        _safeMint(to, newId);
        FighterOps.fighterCreatedEmitter(newId, weight, element, generation[fighterType]);
    }

    function _ableToTransfer(uint256 tokenId, address to) private view returns(bool) {
        return (
          _isApprovedOrOwner(msg.sender, tokenId) &&
          balanceOf(to) < MAX_FIGHTERS_ALLOWED &&
          !fighterStaked[tokenId]
        );
    }
}

contract MergingPool {

    event PointsAdded(uint256 tokenId, uint256 points);

    event Claimed(address claimer, uint32 amount);

    uint256 public winnersPerPeriod = 2;

    uint256 public roundId = 0;

    uint256 public totalPoints = 0;

    address _ownerAddress;

    address _rankedBattleAddress;

    FighterFarm _fighterFarmInstance;

    mapping(address => uint32) public numRoundsClaimed;

    mapping(uint256 => uint256) public fighterPoints;

    mapping(uint256 => address[]) public winnerAddresses;

    mapping(uint256 => bool) public isSelectionComplete;

    mapping(address => bool) public isAdmin;

    constructor(
        address ownerAddress,
        address rankedBattleAddress,
        address fighterFarmAddress
    ) {
        _ownerAddress = ownerAddress;
        _rankedBattleAddress = rankedBattleAddress;
        _fighterFarmInstance = FighterFarm(fighterFarmAddress);
        isAdmin[_ownerAddress] = true;
    }

    function transferOwnership(address newOwnerAddress) external {
        require(msg.sender == _ownerAddress);
        _ownerAddress = newOwnerAddress;
    }

    function adjustAdminAccess(address adminAddress, bool access) external {
        require(msg.sender == _ownerAddress);
        isAdmin[adminAddress] = access;
    }

    function updateWinnersPerPeriod(uint256 newWinnersPerPeriodAmount) external {
        require(isAdmin[msg.sender]);
        winnersPerPeriod = newWinnersPerPeriodAmount;
    }

    function pickWinner(uint256[] calldata winners) external {
        require(isAdmin[msg.sender]);
        require(winners.length == winnersPerPeriod, "Incorrect number of winners");
        require(!isSelectionComplete[roundId], "Winners are already selected");
        uint256 winnersLength = winners.length;
        address[] memory currentWinnerAddresses = new address[](winnersLength);
        for (uint256 i = 0; i < winnersLength; i++) {
            currentWinnerAddresses[i] = _fighterFarmInstance.ownerOf(winners[i]);
            totalPoints -= fighterPoints[winners[i]];
            fighterPoints[winners[i]] = 0;
        }
        winnerAddresses[roundId] = currentWinnerAddresses;
        isSelectionComplete[roundId] = true;
        roundId += 1;
    }

    function claimRewards(
        string[] calldata modelURIs,
        string[] calldata modelTypes,
        uint256[2][] calldata customAttributes
    )
        external
    {
        uint256 winnersLength;
        uint32 claimIndex = 0;
        uint32 lowerBound = numRoundsClaimed[msg.sender];
        for (uint32 currentRound = lowerBound; currentRound < roundId; currentRound++) {
            numRoundsClaimed[msg.sender] += 1;
            winnersLength = winnerAddresses[currentRound].length;
            for (uint32 j = 0; j < winnersLength; j++) {
                if (msg.sender == winnerAddresses[currentRound][j]) {
                    _fighterFarmInstance.mintFromMergingPool(
                        msg.sender,
                        modelURIs[claimIndex],
                        modelTypes[claimIndex],
                        customAttributes[claimIndex]
                    );
                    claimIndex += 1;
                }
            }
        }
        if (claimIndex > 0) {
            emit Claimed(msg.sender, claimIndex);
        }
    }

    function getUnclaimedRewards(address claimer) external view returns(uint256) {
        uint256 winnersLength;
        uint256 numRewards = 0;
        uint32 lowerBound = numRoundsClaimed[claimer];
        for (uint32 currentRound = lowerBound; currentRound < roundId; currentRound++) {
            winnersLength = winnerAddresses[currentRound].length;
            for (uint32 j = 0; j < winnersLength; j++) {
                if (claimer == winnerAddresses[currentRound][j]) {
                    numRewards += 1;
                }
            }
        }
        return numRewards;
    }

    function addPoints(uint256 tokenId, uint256 points) public {
        require(msg.sender == _rankedBattleAddress, "Not Ranked Battle contract address");
        fighterPoints[tokenId] += points;
        totalPoints += points;
        emit PointsAdded(tokenId, points);
    }

    function getFighterPoints(uint256 maxId) public view returns(uint256[] memory) {
        uint256[] memory points = new uint256[](1);
        for (uint256 i = 0; i < maxId; i++) {
            points[i] = fighterPoints[i];
        }
        return points;
    }
}
