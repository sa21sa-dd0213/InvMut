import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant detection", function () {
  it("should revert when assertGovernanceApproved is called without sufficient token balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock", "MCK", 18);
    await mockToken.waitForDeployment();
    
    // Deploy mock LimboDAO
    const MockLimboDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockLimboDAO.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Configure flash governance with the mock token
    const amount = ethers.parseEther("100");
    const unlockTime = 3600; // 1 hour
    const assetBurnable = false;
    
    // First need to make the caller a successful proposal to use onlySuccessfulProposal modifier
    // For testing purposes, we'll directly call configureFlashGovernance by making addr1 a successful proposal
    await mockDAO.setSuccessfulProposal(addr1.address, true);
    
    await instance.connect(addr1).configureFlashGovernance(
      await mockToken.getAddress(),
      amount,
      unlockTime,
      assetBurnable
    );
    
    // Now call assertGovernanceApproved with addr2 who has no tokens
    // The transferFrom will fail because addr2 has no tokens and hasn't approved
    // Original contract should revert with "LIMBO: governance decision rejected."
    // Mutant would silently succeed (no revert)
    await expect(
      instance.connect(addr2).assertGovernanceApproved(
        addr2.address,
        addr1.address,
        false
      )
    ).to.be.revertedWith("LIMBO: governance decision rejected.");
  });
});

// Helper mock contracts
contract("MockERC20", function() {
  // Already defined above with deploy
});

// Note: In actual test file, you would need to deploy mock contracts
// For completeness, here's how to set up the mocks:

/*
// Deploy these before running the test
contract MockERC20 is IERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function totalSupply() external view override returns (uint256) { return 0; }
    function transfer(address to, uint256 amount) external override returns (bool) { return true; }
    function approve(address spender, uint256 amount) external override returns (bool) { return true; }
    function transferFrom(address from, address to, uint256 amount) external override returns (bool) { return false; }
}

contract MockLimboDAO {
    mapping(address => bool) public successfulProposals;
    
    function setSuccessfulProposal(address proposer, bool status) external {
        successfulProposals[proposer] = status;
    }
    
    function successfulProposal(address sender) external view returns (bool) {
        return successfulProposals[sender];
    }
    
    function getFlashGoverner() external view returns (address) { return address(0); }
    function proposalConfig() external view returns (uint256, uint256, address) { return (0, 0, address(0)); }
    function currentProposalState() external view returns (uint256, uint256, address, uint256, address) { return (0, 0, address(0), 0, address(0)); }
}
*/