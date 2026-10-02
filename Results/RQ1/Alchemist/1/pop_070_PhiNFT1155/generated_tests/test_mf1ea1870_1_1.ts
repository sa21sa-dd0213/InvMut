import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant mf1ea1870 detection", function () {
  it("should detect mutant by measuring gas cost difference between first and second mint for same address", async function () {
    const [owner, minter, ref, verifier, protocolFeeDest] = await ethers.getSigners();

    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest.address);

    // Deploy a mock PhiFactory to enable minting
    const MockFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();

    // Set up mock factory return values
    const artId = 1;
    const artCreateFee = ethers.parseEther("0.001");
    const mintFee = ethers.parseEther("0.01");

    // We need to set phiFactoryContract to the mock factory
    // Since initialize sets it to msg.sender, we need to deploy from the factory address
    // or use storage manipulation

    // Simplified approach: Use the fact that minted mapping is public
    // We can directly call _mint through the internal function by using the claimFromFactory path

    // Create art first
    const artFee = ethers.parseEther("0.001");
    await instance.createArtFromFactory(artId, { value: artFee });

    // Now call claimFromFactory to trigger mint
    const quantity = 1;
    const imageURI = "ipfs://test";
    const data = ethers.hexlify(ethers.toUtf8Bytes("test"));

    // First mint - should set minted[minter] = true
    const tx1 = await instance.connect(owner).claimFromFactory(
      artId,
      minter.address,
      ref.address,
      verifier.address,
      quantity,
      data,
      imageURI,
      { value: mintFee }
    );
    const receipt1 = await tx1.wait();
    const gasUsed1 = receipt1.gasUsed;

    // Second mint for same address - original should skip SSTORE, mutant should not
    const tx2 = await instance.connect(owner).claimFromFactory(
      artId,
      minter.address,
      ref.address,
      verifier.address,
      quantity,
      data,
      imageURI,
      { value: mintFee }
    );
    const receipt2 = await tx2.wait();
    const gasUsed2 = receipt2.gasUsed;

    // In the original, gasUsed2 should be less than gasUsed1 due to skipped SSTORE
    // In the mutant, gasUsed2 should be approximately equal to gasUsed1
    // The difference should be at least the cost of one SSTORE (~20000 gas)
    expect(gasUsed2).to.be.lessThan(gasUsed1 - 10000n);
  });
});