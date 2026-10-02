import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - kill mutant m61596631 (onlyPhiFactory modifier)", function () {
  it("should revert when calling claimFromFactory from non-PhiFactory address after modifier removal", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 with constructor arguments
    const PhiNFT1155Factory = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155 = await PhiNFT1155Factory.deploy();
    await phiNFT1155.waitForDeployment();
    
    // Initialize the contract (needed before calling claimFromFactory)
    // Using owner as protocolFeeDestination for simplicity
    await phiNFT1155.initialize(
      1,                              // credChainId
      1,                              // credId
      "test",                         // verificationType
      owner.address                   // protocolFeeDestination
    );
    
    // Now try to call claimFromFactory from a non-PhiFactory address (addr1)
    // The original modifier should revert with NotPhiFactory()
    // The mutant removes the check, so it will not revert
    await expect(
      phiNFT1155.connect(addr1).claimFromFactory(
        1,                            // artId_
        addr1.address,                // minter_
        ethers.ZeroAddress,           // ref_
        ethers.ZeroAddress,           // verifier_
        1,                            // quantity_
        ethers.ZeroHash,              // data_
        ""                            // imageURI_
      )
    ).to.be.revertedWithCustomError(phiNFT1155, "NotPhiFactory");
    
    // Note: This test will pass on the original (reverts as expected)
    // and will fail on the mutant (doesn't revert, so expect().to.be.reverted fails)
  });

  it("should revert when calling createArtFromFactory from non-PhiFactory address after modifier removal", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const PhiNFT1155Factory = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155 = await PhiNFT1155Factory.deploy();
    await phiNFT1155.waitForDeployment();
    
    await phiNFT1155.initialize(
      1,
      1,
      "test",
      owner.address
    );
    
    // Try to call createArtFromFactory from a non-PhiFactory address
    await expect(
      phiNFT1155.connect(addr1).createArtFromFactory(1, { value: 0 })
    ).to.be.revertedWithCustomError(phiNFT1155, "NotPhiFactory");
  });
});