import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m28f55a89 - claimFromFactory onlyPhiFactory modifier", function () {
  it("should revert when claimFromFactory is called by an unauthorized address (not PhiFactory)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock PhiFactory
    const MockPhiFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockPhiFactory.deploy();
    await mockFactory.waitForDeployment();

    // Deploy PhiNFT1155
    const PhiNFT1155 = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155 = await PhiNFT1155.deploy();
    await phiNFT1155.waitForDeployment();

    // Initialize the contract - this sets phiFactoryContract = msg.sender (owner)
    // But we want phiFactoryContract to be the mock factory
    // So we need to initialize with the mock factory as the caller
    // We'll use impersonation or a workaround
    
    // Since initialize sets phiFactoryContract = msg.sender, we need to call it from the mock factory
    // Let's use the mock factory to call initialize on the phiNFT1155
    // But first we need to set up the mock factory to have the right return values
    
    // Set protocol fee destination in mock
    await mockFactory.setProtocolFeeDestination(addr1.address);
    
    // Have the mock factory call initialize on the NFT contract
    await mockFactory.callInitialize(
      phiNFT1155.target,
      1, // credChainId
      1, // credId
      "test", // verificationType
      addr1.address // protocolFeeDestination
    );

    // Now phiFactoryContract should be the mock factory
    const factoryAddress = await phiNFT1155.phiFactoryContract();
    expect(factoryAddress).to.equal(mockFactory.target);

    // Try calling claimFromFactory from an unauthorized address (addr2)
    // This should revert because only the PhiFactory should be able to call it
    await expect(
      phiNFT1155.connect(addr2).claimFromFactory(
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