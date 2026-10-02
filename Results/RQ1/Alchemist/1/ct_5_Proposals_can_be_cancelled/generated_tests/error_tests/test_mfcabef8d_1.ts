import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DAO mutant mfcabef8d - moveRewardAddress", function () {
  it("should kill the mutant by calling moveRewardAddress with a valid non-zero address and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock VADER, USDV, and VAULT contracts
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSDV = await MockERC20.deploy("USDV", "USDV", 18);
    await mockUSDV.waitForDeployment();
    
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();
    
    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    const mockVAULT = await MockVAULT.deploy();
    await mockVAULT.waitForDeployment();
    
    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize DAO
    await instance.init(
      await mockVADER.getAddress(),
      await mockUSDV.getAddress(),
      await mockVAULT.getAddress()
    );
    
    // Create a new address proposal of type "REWARD" with a valid non-zero address
    const validAddress = addr1.address;
    await instance.newAddressProposal(validAddress, "REWARD");
    
    // Get the proposal ID (should be 1)
    const proposalID = 1;
    
    // Vote on the proposal to trigger finalising
    await instance.voteProposal(proposalID);
    
    // Wait for coolOffPeriod (1 second) to pass
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // Call finaliseProposal - this should call moveRewardAddress internally
    // On the original: succeeds because validAddress != address(0)
    // On the mutant: reverts because validAddress == address(0) is false
    await expect(instance.finaliseProposal(proposalID)).to.not.be.reverted;
    
    // Verify the reward address was actually changed
    const actualRewardAddress = await mockVADER.rewardAddress();
    expect(actualRewardAddress).to.equal(validAddress);
  });
});