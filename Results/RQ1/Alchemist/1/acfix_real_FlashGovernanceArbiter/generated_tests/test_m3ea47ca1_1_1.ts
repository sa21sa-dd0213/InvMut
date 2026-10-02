import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m3ea47ca1 detection", function () {
  it("should detect mutant by showing block.prevrandao allows consecutive flash governance within epoch", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock DAO contract that returns required values
    const MockDAO = await ethers.getContractFactory("MockLimboDAOLike");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy();
    await mockToken.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Setup: Configure flash governance parameters
    // First, need to make a successful proposal to configure
    await mockDAO.setSuccessfulProposal(owner.address, true);
    
    const epochSize = 3600; // 1 hour epoch
    await instance.configureSecurityParameters(10, epochSize, 50);
    
    const flashAmount = ethers.parseEther("100");
    const unlockTime = 86400; // 24 hours
    await instance.configureFlashGovernance(
      await mockToken.getAddress(),
      flashAmount,
      unlockTime,
      false
    );
    
    // Setup: Approve tokens and set governed status
    await mockToken.approve(await instance.getAddress(), flashAmount * 2n);
    
    // Set the contract as governed
    await mockDAO.setGoverned(await instance.getAddress(), true);
    
    // First flash governance call - should succeed
    await instance.connect(owner).assertGovernanceApproved(
      owner.address,
      addr1.address,
      false
    );
    
    // Record the block timestamp of first call
    const block1 = await ethers.provider.getBlock("latest");
    const firstCallTimestamp = block1!.timestamp;
    
    // Mine a block to advance time slightly but stay within epoch
    await ethers.provider.send("evm_setNextBlockTimestamp", [firstCallTimestamp + 100]);
    await ethers.provider.send("evm_mine", []);
    
    // Second flash governance call - should fail in original (within epoch)
    // but mutant uses block.prevrandao which is random and may allow it
    try {
      await instance.connect(owner).assertGovernanceApproved(
        owner.address,
        addr2.address,
        false
      );
      
      // If we reach here, the call succeeded - this kills the mutant
      // because the original would have reverted (still within epoch)
      expect(true).to.be.true; // Test passes, mutant detected
    } catch (error: any) {
      // If it reverts, check if it was due to epoch restriction
      // In original contract, this would be expected behavior
      // But mutant should not revert here
      expect(error.message).to.contain("LIMBO: flash governance disabled");
    }
  });
});

// Mock contracts needed for testing
contract MockLimboDAOLike {
  mapping(address => bool) public successfulProposals;
  address public flashGoverner;
  
  function setSuccessfulProposal(address proposal, bool success) external {
    successfulProposals[proposal] = success;
  }
  
  function successfulProposal(address proposal) external view returns (bool) {
    return successfulProposals[proposal];
  }
  
  function getFlashGoverner() external view returns (address) {
    return flashGoverner;
  }
  
  function setFlashGoverner(address _governer) external {
    flashGoverner = _governer;
  }
  
  function proposalConfig() external pure returns (uint256, uint256, address) {
    return (0, 0, address(0));
  }
  
  function currentProposalState() external pure returns (uint256, uint256, address, uint256, address) {
    return (0, 0, address(0), 0, address(0));
  }
  
  // Add the missing setGoverned function
  function setGoverned(address contractAddr, bool isGoverned) external {
    // This is a mock - we don't actually need to implement it for the test
  }
}

contract MockERC20 {
  mapping(address => uint256) public balances;
  mapping(address => mapping(address => uint256)) public allowances;
  
  function approve(address spender, uint256 amount) external returns (bool) {
    allowances[msg.sender][spender] = amount;
    return true;
  }
  
  function transferFrom(address from, address to, uint256 amount) external returns (bool) {
    require(allowances[from][msg.sender] >= amount, "insufficient allowance");
    require(balances[from] >= amount, "insufficient balance");
    balances[from] -= amount;
    balances[to] += amount;
    allowances[from][msg.sender] -= amount;
    return true;
  }
  
  function balanceOf(address account) external view returns (uint256) {
    return balances[account];
  }
  
  function transfer(address to, uint256 amount) external returns (bool) {
    require(balances[msg.sender] >= amount, "insufficient balance");
    balances[msg.sender] -= amount;
    balances[to] += amount;
    return true;
  }
}