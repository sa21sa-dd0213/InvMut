import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - burnFlashGovernanceAsset mutant detection", function () {
  it("should detect mutant where assetBurnable is replaced with false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock ERC20 that can be burned
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test", "TST", ethers.parseEther("1000"));
    await mockToken.waitForDeployment();
    
    // Deploy the FlashGovernanceArbiter
    // Note: constructor requires a DAO address - using addr1 as placeholder DAO
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiter.deploy(addr1.address);
    await arbiter.waitForDeployment();
    
    // Configure flash governance with assetBurnable = true
    const amount = ethers.parseEther("100");
    const unlockTime = 3600; // 1 hour
    const assetBurnable = true;
    
    // Need to set up a successful proposal to call configureFlashGovernance
    // First, set the DAO to owner so we can configure
    await arbiter.setDAO(owner.address);
    
    // Since the contract requires onlySuccessfulProposal modifier, we need to bypass it
    // by setting configured = false first (via endConfiguration)
    // Actually, let's deploy a mock LimboDAO to satisfy the requirements
    const LimboDAOMock = await ethers.getContractFactory("LimboDAOMock");
    const mockDAO = await LimboDAOMock.deploy();
    await mockDAO.waitForDeployment();
    
    // Set the DAO in arbiter
    await arbiter.setDAO(await mockDAO.getAddress());
    
    // Configure flash governance (this requires successful proposal - mock DAO returns true)
    await arbiter.configureFlashGovernance(
      await mockToken.getAddress(),
      amount,
      unlockTime,
      assetBurnable
    );
    
    // Now make a flash governance decision first
    // Transfer tokens to addr1 for the flash governance
    await mockToken.transfer(addr1.address, amount);
    await mockToken.connect(addr1).approve(await arbiter.getAddress(), amount);
    
    // Call assertGovernanceApproved to create pending decision
    await arbiter.connect(addr1).assertGovernanceApproved(
      addr1.address,
      addr2.address,
      false
    );
    
    // Now try to burn the asset
    // Get initial balance of mockToken
    const initialSupply = await mockToken.totalSupply();
    
    // Call burnFlashGovernanceAsset - this should burn tokens if assetBurnable is true
    await arbiter.connect(owner).burnFlashGovernanceAsset(
      addr2.address,
      addr1.address,
      await mockToken.getAddress(),
      amount
    );
    
    // Verify the tokens were burned (total supply decreased)
    const finalSupply = await mockToken.totalSupply();
    
    // In the original contract, the burn should happen, decreasing supply
    // In the mutant, the burn is skipped (false instead of assetBurnable), so supply stays the same
    expect(finalSupply).to.be.lessThan(initialSupply);
  });
});

// Helper contracts need to be deployed separately
contract MockERC20 {
    string public name;
    string public symbol;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor(string memory _name, string memory _symbol, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        totalSupply = _initialSupply;
        balanceOf[msg.sender] = _initialSupply;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function burn(uint256 amount) external {
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
    }
}

contract LimboDAOMock {
    function successfulProposal(address) external pure returns (bool) {
        return true;
    }
    
    function proposalConfig() external pure returns (uint256, uint256, address) {
        return (0, 0, address(0));
    }
    
    function getFlashGoverner() external pure returns (address) {
        return address(0);
    }
}