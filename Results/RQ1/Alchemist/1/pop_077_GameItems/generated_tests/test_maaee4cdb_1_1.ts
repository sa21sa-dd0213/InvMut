import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - Kill mutant maaee4cdb (uri returns false instead of checking customURI)", function () {
  it("should return custom token URI when set, but mutant always returns base URI", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const treasuryAddress = addr1.address;

    // Deploy GameItems with required constructor arguments (owner, treasuryAddress)
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, treasuryAddress);
    await gameItems.waitForDeployment();

    // Deploy Neuron contract for minting functionality (required for createGameItem precondition)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, treasuryAddress, owner.address);
    await neuron.waitForDeployment();

    // Set up admin and instantiate Neuron contract
    await gameItems.connect(owner).instantiateNeuronContract(await neuron.getAddress());

    // Create a game item with a custom token URI
    const customURI = "https://custom-uri.com/metadata/1";
    await gameItems.connect(owner).createGameItem(
      "Test Item",
      customURI,
      false,  // finiteSupply
      true,   // transferable
      100,    // itemsRemaining
      ethers.parseEther("10"), // itemPrice
      10      // dailyAllowance
    );

    // Call uri(0) for the newly created token
    const returnedURI = await gameItems.uri(0);

    // In the original contract, this should return the customURI
    // In the mutant, it returns the base URI "https://ipfs.io/ipfs/" instead
    expect(returnedURI).to.equal(customURI);
  });
});