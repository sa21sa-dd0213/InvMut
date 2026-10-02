import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant detection - flashEnabled modifier", function () {
  it("should revert when assertGovernanceApproved is called from unauthorized address", async function () {
    // Get signers
    const [owner, daoAddress, unauthorizedUser] = await ethers.getSigners();
    
    // Deploy FlashGovernanceArbiter with DAO address as constructor argument
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiter.deploy(daoAddress.address);
    await arbiter.waitForDeployment();
    
    // Configure flash governance to set up required parameters
    // First, we need to configure the DAO address and set up the flash governance config
    // Deploy a mock ERC20 token for testing
    const ERC20 = await ethers.getContractFactory("IERC20");
    // Since we can't deploy IERC20 directly, we'll use a simple ERC20 implementation
    const SimpleERC20 = await ethers.getContractFactory("contracts/mocks/SimpleERC20.sol:SimpleERC20");
    const token = await SimpleERC20.deploy("Test", "TST", ethers.parseEther("1000000"));
    await token.waitForDeployment();
    
    // Send some tokens to unauthorized user for the transferFrom to work
    await token.transfer(unauthorizedUser.address, ethers.parseEther("1000"));
    
    // Configure flash governance (this would normally require onlySuccessfulProposal modifier)
    // Since we're the owner and configured flag might not be set, we can directly configure
    // First, set DAO to allow configuration
    await arbiter.setDAO(daoAddress.address);
    
    // Configure flash governance parameters
    // We need to make the unauthorized user approve the arbiter to spend tokens
    await token.connect(unauthorizedUser).approve(arbiter.target, ethers.parseEther("100"));
    
    // Call assertGovernanceApproved from unauthorized address
    // This should revert with "LIMBO: EP" on the original contract
    // but on the mutant (without the require check), it might not revert
    await expect(
      arbiter.connect(unauthorizedUser).assertGovernanceApproved(
        unauthorizedUser.address,
        arbiter.target,
        false
      )
    ).to.be.revertedWith("LIMBO: EP");
  });
});