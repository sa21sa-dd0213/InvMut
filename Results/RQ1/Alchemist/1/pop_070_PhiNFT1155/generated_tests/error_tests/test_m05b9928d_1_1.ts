import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m05b9928d", function () {
  it("should revert when unauthorized user tries to transfer tokens without approval", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy PhiNFT1155 with constructor arguments
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    const protocolFeeDest = owner.address;

    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest);

    // Deploy a mock PhiFactory to interact with the contract
    // We need to create a mock that returns proper values for the factory calls
    const mockFactory = await ethers.deployContract("MockPhiFactory", []);
    await mockFactory.waitForDeployment();

    // Set the factory contract on our PhiNFT1155 instance
    // Since we can't directly set it, we need to work with the deployed contract
    // For this test, we'll directly test the safeTransferFrom authorization check
    
    // The test should verify that an unauthorized transfer reverts
    // We need to get some tokens first - let's use the createArtFromFactory path
    // But we need the phiFactoryContract to be set to our mock
    
    // First, let's check if there's a way to set the factory
    // The factory is set during initialize to msg.sender (which is the deployer)
    // We can't change it easily, so let's use a different approach
    
    // Let's deploy a minimal contract that can act as PhiFactory
    // and use it to create art and mint tokens
    
    // Actually, let's try a simpler approach - we'll deploy the mock factory
    // and then deploy a new PhiNFT1155 with the mock factory as the deployer
    
    // Deploy a new PhiNFT1155 with the mock factory as the deployer
    const Factory2 = await ethers.getContractFactory("PhiNFT1155");
    const instance2 = await Factory2.deploy();
    await instance2.waitForDeployment();
    
    // Initialize with the mock factory
    // But initialize sets phiFactoryContract to msg.sender
    // So we need to call initialize from the mock factory's address
    // Since we can't impersonate, let's use a different approach
    
    // Let's just test the revert directly by calling safeTransferFrom
    // with an unauthorized address - the function should revert due to missing approval
    
    // First, let's mint some tokens to addr1 by using the contract's functionality
    // We need to set up the proper state
    
    // For simplicity, let's test the revert directly
    // The function should revert because:
    // 1. from_ is not the sender (addr2 is calling)
    // 2. addr2 is not approved for all from addr1
    
    // Since we don't have tokens minted, we can test with tokenId 1
    // The safeTransferFrom will check authorization before checking balances
    // So it should revert with ERC1155MissingApprovalForAll
    
    await expect(
      instance.connect(addr2).safeTransferFrom(
        addr1.address,  // from
        addr2.address,  // to
        1,             // tokenId
        1,             // value
        "0x"           // data
      )
    ).to.be.revertedWith("ERC1155MissingApprovalForAll");
  });
});