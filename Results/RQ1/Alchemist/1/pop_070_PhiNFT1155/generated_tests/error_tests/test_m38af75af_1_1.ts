import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - kill mutant m38af75af (ArtClaimedData event emission removed)", function () {
  it("should emit ArtClaimedData event when claimFromFactory is called", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    const protocolFeeDestination = owner.address;

    await instance.initialize(
      credChainId,
      credId,
      verificationType,
      protocolFeeDestination
    );

    // Get the phiFactoryContract address from the initialized contract
    const phiFactoryAddress = await instance.phiFactoryContract();

    // We need to simulate a claimFromFactory call
    // First, we need to create an art via the factory to set up _artIdToTokenId mapping
    // Since we can't directly call createArtFromFactory (onlyPhiFactory modifier),
    // we need to deploy a mock factory or use the actual phiFactoryContract

    // For testing purposes, we'll set up the artId to tokenId mapping by calling createArtFromFactory
    // This requires the phiFactoryContract to call it, but we can't easily do that in isolation.
    // Instead, let's check the event emission directly by calling claimFromFactory with proper setup

    // First, let's get the phiFactoryContract and set up art data
    // We need to create an art first to have a valid artId/tokenId mapping
    // Since createArtFromFactory has onlyPhiFactory modifier, we need to simulate the factory

    // Let's deploy a minimal test helper to act as the phiFactory
    // For now, let's just verify the event emission by directly calling claimFromFactory
    // after setting up the necessary state

    // The key test: call claimFromFactory and verify ArtClaimedData event is emitted
    // We'll need to ensure we can call this function (onlyPhiFactory modifier requires msg.sender to be factory)

    // Let's use the actual contract state - we need to call createArtFromFactory first
    // But since only the factory can call it, we'll need to impersonate or set up properly

    // Alternative approach: test the event emission by checking if the event exists
    // by calling claimFromFactory with proper parameters

    // For this test, we'll verify the event is emitted by checking transaction receipt
    const artId = 1;
    const tokenId = 1;
    const quantity = 1;
    const data = ethers.hexlify(ethers.randomBytes(32));
    const imageURI = "ipfs://test";

    // We need to set up the artId->tokenId mapping first
    // Let's call createArtFromFactory (only possible if msg.sender is phiFactoryContract)
    // For testing, we'll deploy a simple contract that can call createArtFromFactory

    // Since we can't easily do this without the actual factory, let's test the event
    // by checking if the function reverts when called from wrong address
    // and verify the event is not emitted when it shouldn't be

    // The hypothesis: the mutant removes the event emission
    // So we need to call claimFromFactory and check if the event is emitted

    // Let's deploy a minimal mock factory to test
    const MockFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();

    // Set up the factory address in the PhiNFT1155 contract
    // This requires the owner to set it, but the contract doesn't have a setter for phiFactoryContract
    // The phiFactoryContract is set during initialize to msg.sender

    // Let's reinitialize with a different approach
    // Actually, let's just test the event by calling claimFromFactory from the factory
    // Since we can't change the factory address after initialization, let's create a new instance

    // Deploy a new instance with a mock factory
    const Factory2 = await ethers.getContractFactory("PhiNFT1155");
    const instance2 = await Factory2.deploy();
    await instance2.waitForDeployment();

    // Initialize with a mock factory
    const mockFactoryAddress = await mockFactory.getAddress();

    // We need to call initialize with the mock factory as msg.sender
    // But initialize is called by the owner, not the factory
    // The phiFactoryContract is set to msg.sender during initialize

    // Let's just test the event by checking if claimFromFactory emits it
    // We'll call the function and check the transaction receipt

    // First, set up the artId->tokenId mapping by calling createArtFromFactory
    // This requires the factory to call it, so let's create a helper

    // Deploy a helper contract that can call createArtFromFactory
    const HelperFactory = await ethers.getContractFactory("PhiNFT1155TestHelper");
    const helper = await HelperFactory.deploy();
    await helper.waitForDeployment();

    // Now let's set up the state properly
    // We need the phiFactoryContract to be able to call createArtFromFactory
    // Since the contract sets phiFactoryContract to msg.sender during initialize,
    // we need to initialize with a contract that can act as factory

    // For this test, we'll use a different approach: 
    // Deploy a test contract that acts as both factory and PhiNFT1155 caller
    const TestHarness = await ethers.getContractFactory("TestHarness");
    const testHarness = await TestHarness.deploy();
    await testHarness.waitForDeployment();

    // Call the test harness to test the event emission
    const tx = await testHarness.testArtClaimedDataEvent(instance2.getAddress());
    const receipt = await tx.wait();

    // Check if ArtClaimedData event was emitted
    const event = receipt.logs.find(
      (log: any) => log.topics[0] === ethers.id("ArtClaimedData(address,address,address,address,uint256,uint256,uint256,bytes32)")
    );

    expect(event).to.not.be.undefined;

    // Verify event parameters
    const abiCoder = new ethers.AbiCoder();
    const decoded = abiCoder.decode(
      ["address", "address", "address", "address", "uint256", "uint256", "uint256", "bytes32"],
      event.data
    );

    expect(decoded[0]).to.equal(addr1.address); // minter
    expect(decoded[4]).to.equal(1); // artId
    expect(decoded[5]).to.equal(1); // tokenId
    expect(decoded[6]).to.equal(1); // quantity
  });
});