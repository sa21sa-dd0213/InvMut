import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection - balanceOfToken exponentiation bug", function () {
  it("should detect mutant that uses ** instead of * in balanceOfToken calculation", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock mAsset and mock savings contract that return known values
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockMAsset = await MockERC20.deploy("Mock mAsset", "mASSET", 18);
    await mockMAsset.waitForDeployment();

    const MockSavingsV2 = await ethers.getContractFactory("MockSavingsV2");
    const mockSavings = await MockSavingsV2.deploy(await mockMAsset.getAddress());
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Setup: mint tokens to owner and approve the yield source
    const supplyAmount = ethers.parseEther("100");
    await mockMAsset.mint(owner.address, supplyAmount);
    await mockMAsset.connect(owner).approve(await instance.getAddress(), supplyAmount);

    // Supply tokens to get imBalances recorded
    await instance.connect(owner).supplyTokenTo(supplyAmount, owner.address);

    // Get the exchange rate from the mock (should be 1e18 for simplicity)
    const exchangeRate = await mockSavings.exchangeRate();

    // Calculate expected balance: (imBalances[owner] * exchangeRate) / 1e18
    const imBalances = await instance.imBalances(owner.address);
    const expectedBalance = (imBalances * exchangeRate) / BigInt(1e18);

    // Call balanceOfToken - the mutant would use ** instead of *
    const actualBalance = await instance.balanceOfToken(owner.address);

    // The mutant would produce an astronomically large number (imBalances ** exchangeRate)
    // which will not equal the expected proportional balance
    expect(actualBalance).to.equal(expectedBalance);
  });
});

// Mock contracts needed for the test
// These would be defined in separate files in a real setup, but included here for completeness
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

contract MockSavingsV2 {
    IERC20 public underlying;
    uint256 public exchangeRate = 1e18;
    mapping(address => uint256) public creditBalances;

    constructor(address _underlying) {
        underlying = IERC20(_underlying);
    }

    function depositSavings(uint256 amount) external returns (uint256 creditsIssued) {
        underlying.transferFrom(msg.sender, address(this), amount);
        creditsIssued = amount;
        creditBalances[msg.sender] += creditsIssued;
        return creditsIssued;
    }

    function redeemUnderlying(uint256 amount) external returns (uint256 creditsBurned) {
        creditsBurned = amount;
        creditBalances[msg.sender] -= creditsBurned;
        underlying.transfer(msg.sender, amount);
        return creditsBurned;
    }

    function underlyingToCredits(uint256 _underlying) external view returns (uint256 credits) {
        credits = _underlying;
    }

    function creditsToUnderlying(uint256 _credits) external view returns (uint256 underlying) {
        underlying = _credits;
    }

    function balanceOfUnderlying(address _user) external view returns (uint256 underlying) {
        underlying = creditBalances[_user];
    }
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}