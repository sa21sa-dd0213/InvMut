import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MStableYieldSource mutant kill test - balanceOfToken exponentiation bug", function () {
  it("should return correct balance based on multiplication, not exponentiation", async function () {
    // Deploy a mock savings contract that returns a fixed exchange rate
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy();
    await mockSavings.waitForDeployment();

    // Deploy a mock mAsset token
    const MockToken = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockToken.deploy("Mock MAsset", "mUSD", 18);
    await mockToken.waitForDeployment();

    // Configure the mock savings to return our mock token as underlying
    await mockSavings.setUnderlying(await mockToken.getAddress());

    // Deploy MStableYieldSource with the mock savings
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    const [owner, addr1] = await ethers.getSigners();

    // Set a fixed exchange rate in the mock savings (e.g., 2 * 1e18 meaning 1 credit = 2 underlying)
    const exchangeRate = ethers.parseEther("2");
    await mockSavings.setExchangeRate(exchangeRate);

    // Manually set imBalances for addr1 to a known value (e.g., 100 credits)
    const credits = ethers.parseEther("100");
    await instance.setImBalance(addr1.address, credits);

    // Call balanceOfToken
    const balance = await instance.balanceOfToken(addr1.address);

    // Expected: credits * exchangeRate / 1e18 = 100e18 * 2e18 / 1e18 = 200e18
    const expectedBalance = credits * exchangeRate / ethers.parseEther("1");
    expect(balance).to.equal(expectedBalance);
  });
});

// Helper contracts for testing (these would be in separate files or inline)
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}

contract MockSavingsContractV2 {
    address private _underlying;
    uint256 private _exchangeRate;
    mapping(address => uint256) public creditBalances;

    function setUnderlying(address underlying) external {
        _underlying = underlying;
    }

    function setExchangeRate(uint256 rate) external {
        _exchangeRate = rate;
    }

    function underlying() external view returns (IERC20) {
        return IERC20(_underlying);
    }

    function exchangeRate() external view returns (uint256) {
        return _exchangeRate;
    }

    function depositSavings(uint256 amount) external returns (uint256) {
        // For testing, just return amount as credits
        return amount;
    }

    function redeemUnderlying(uint256 amount) external returns (uint256) {
        // For testing, just return amount as credits burned
        return amount;
    }

    function creditBalances(address) external view returns (uint256) {
        return 0;
    }
}