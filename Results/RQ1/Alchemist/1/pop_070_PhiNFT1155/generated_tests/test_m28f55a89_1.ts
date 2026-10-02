import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m28f55a89 - claimFromFactory onlyPhiFactory modifier", function () {
  it("should revert when claimFromFactory is called by an unauthorized address (not PhiFactory)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const PhiNFT1155 = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155 = await PhiNFT1155.deploy();
    await phiNFT1155.waitForDeployment();
    
    // Initialize the contract (needed before calling claimFromFactory)
    // The PhiFactory is set during initialization, so we need to simulate that
    // Since we can't easily deploy a full PhiFactory, we'll deploy a minimal mock
    // that returns the necessary values for the contract to work
    
    // Deploy a mock PhiFactory that returns the required values
    const MockPhiFactory = await ethers.getContractFactory("contracts/mocks/MockPhiFactory.sol:MockPhiFactory");
    const mockFactory = await MockPhiFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Initialize the PhiNFT1155 contract
    // The initialize function sets phiFactoryContract = msg.sender, so we call it as the mock factory
    await phiNFT1155.connect(owner).initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      addr1.address // protocolFeeDestination
    );
    
    // Now we need to simulate that the phiFactoryContract is set to our mock
    // We can't directly change it, but we can deploy a new contract that has it set
    // Actually, the initialize function sets phiFactoryContract = msg.sender
    // So we need to call initialize from the mock factory address
    // Let's deploy a new instance and initialize it properly
    
    // Deploy a new instance
    const PhiNFT1155New = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155New = await PhiNFT1155New.deploy();
    await phiNFT1155New.waitForDeployment();
    
    // Initialize with mock factory as msg.sender
    await phiNFT1155New.connect(owner).initialize(
      1,
      1,
      "test",
      addr1.address
    );
    
    // Now try to call claimFromFactory from an unauthorized address (addr2)
    // This should revert because only the PhiFactory (which is the owner in our setup) should be able to call it
    // But wait - the owner is not the PhiFactory, the owner initialized it, so the PhiFactory is the owner
    
    // Let's check the current phiFactoryContract address
    const factoryAddress = await phiNFT1155New.phiFactoryContract();
    
    // Try calling claimFromFactory from addr2 (unauthorized)
    await expect(
      phiNFT1155New.connect(addr2).claimFromFactory(
        1, // artId_
        addr2.address, // minter_
        ethers.ZeroAddress, // ref_
        ethers.ZeroAddress, // verifier_
        1, // quantity_
        ethers.ZeroHash, // data_
        "" // imageURI_
      )
    ).to.be.revertedWith("NotPhiFactory");
  });
});