import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant kill test - getAllowanceRemaining", function () {
  it("should detect mutant that replaces dailyAllowanceReplenishTime check with false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // Create a game item with daily allowance
    await instance.createGameItem(
      "Test Item",
      "https://test.uri",
      false, // finiteSupply
      true,  // transferable
      100,   // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      10     // dailyAllowance
    );

    // First, mint some tokens to addr1 so they can purchase
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuronInstance = await NeuronFactory.deploy(owner.address, owner.address, addr1.address);
    await neuronInstance.waitForDeployment();

    await instance.instantiateNeuronContract(await neuronInstance.getAddress());

    // Mint tokens to addr1 for purchase
    await neuronInstance.mint(addr1.address, ethers.parseEther("100"));

    // Purchase 5 items to deplete some allowance
    await instance.connect(addr1).mint(0, 5);

    // Check remaining allowance after purchase
    let remaining = await instance.getAllowanceRemaining(addr1.address, 0);
    expect(remaining).to.equal(5); // 10 daily - 5 purchased = 5 remaining

    // Fast forward time past the daily allowance replenish time (1 day)
    await ethers.provider.send("evm_increaseTime", [86401]); // 1 day + 1 second
    await ethers.provider.send("evm_mine");

    // After replenish time, original should return full daily allowance (10)
    // Mutant will still return the old remaining value (5)
    remaining = await instance.getAllowanceRemaining(addr1.address, 0);

    // The original contract would return 10 (full daily allowance)
    // The mutant returns 5 (old remaining value)
    // This assertion kills the mutant because it expects the replenished value
    expect(remaining).to.equal(10);
  });
});