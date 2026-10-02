import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - kill mutant m468688ec (OR -> AND in mint)", function () {
  it("should allow minting when daily allowance has been partially consumed and replenishment time has not passed, but quantity <= remaining allowance", async function () {
    const [owner, buyer, treasury] = await ethers.getSigners();

    // Deploy Neuron contract first (required for GameItems minting)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuronInstance = await NeuronFactory.deploy(owner.address, treasury.address, buyer.address);
    await neuronInstance.waitForDeployment();

    // Deploy GameItems contract
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, treasury.address);
    await instance.waitForDeployment();

    // Setup: instantiate Neuron contract in GameItems
    await instance.instantiateNeuronContract(await neuronInstance.getAddress());

    // Give buyer some NRN tokens for purchase
    const buyerNrnBalance = ethers.parseEther("1000");
    await neuronInstance.mint(buyer.address, buyerNrnBalance);

    // Create a game item with daily allowance of 10, finite supply, transferable, price 1 NRN
    await instance.createGameItem(
      "TestItem",
      "ipfs://test",
      true,      // finiteSupply
      true,      // transferable
      100,       // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      10         // dailyAllowance
    );

    const tokenId = 0;

    // Buyer mints 5 items first (half of daily allowance)
    await instance.connect(buyer).mint(tokenId, 5);

    // Verify remaining allowance is 5
    expect(await instance.getAllowanceRemaining(buyer.address, tokenId)).to.equal(5);

    // Now try to mint 3 more items (within remaining allowance of 5)
    // but before daily allowance replenishment time
    // Original: should succeed (quantity 3 <= remaining 5)
    // Mutant: should revert (dailyAllowanceReplenishTime > block.timestamp is false)
    await instance.connect(buyer).mint(tokenId, 3);

    // Verify the mint was successful
    expect(await instance.balanceOf(buyer.address, tokenId)).to.equal(8);
    expect(await instance.getAllowanceRemaining(buyer.address, tokenId)).to.equal(2);
  });
});