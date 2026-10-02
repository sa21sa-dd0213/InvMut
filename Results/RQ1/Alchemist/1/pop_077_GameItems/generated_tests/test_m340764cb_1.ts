import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant detection - getAllowanceRemaining", function () {
  it("should detect mutant that removes return of remaining allowance when allowance has been partially used", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const treasuryAddress = addr1.address;
    
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, treasuryAddress);
    await instance.waitForDeployment();

    // Create a game item with daily allowance
    const name = "TestItem";
    const tokenURI = "https://test.uri";
    const finiteSupply = false;
    const transferable = true;
    const itemsRemaining = 100;
    const itemPrice = ethers.parseEther("1");
    const dailyAllowance = 10;
    
    await instance.connect(owner).createGameItem(
      name,
      tokenURI,
      finiteSupply,
      transferable,
      itemsRemaining,
      itemPrice,
      dailyAllowance
    );

    // Get the tokenId (0 since it's the first item)
    const tokenId = 0;

    // Simulate time passage to ensure we can use the daily allowance
    await ethers.provider.send("evm_increaseTime", [86401]); // 1 day + 1 second
    await ethers.provider.send("evm_mine");

    // Check initial allowance - should be dailyAllowance (10)
    const initialAllowance = await instance.connect(owner).getAllowanceRemaining(owner.address, tokenId);
    expect(initialAllowance).to.equal(dailyAllowance);

    // Partially use the allowance by minting some tokens
    // First need to set up Neuron contract for minting
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuronInstance = await NeuronFactory.deploy(
      owner.address,
      treasuryAddress,
      owner.address
    );
    await neuronInstance.waitForDeployment();

    // Give owner some NRN tokens for purchase
    await neuronInstance.connect(owner).mint(owner.address, ethers.parseEther("1000"));
    
    // Set the Neuron contract in GameItems
    await instance.connect(owner).instantiateNeuronContract(await neuronInstance.getAddress());

    // Purchase 3 tokens (reducing allowance from 10 to 7)
    await neuronInstance.connect(owner).approve(await instance.getAddress(), ethers.parseEther("3"));
    await instance.connect(owner).mint(tokenId, 3);

    // Now call getAllowanceRemaining before replenish time
    // The remaining should be 7 (10 - 3), not the full dailyAllowance of 10
    const remainingAllowance = await instance.connect(owner).getAllowanceRemaining(owner.address, tokenId);
    
    // The original contract would return 7 (the actual remaining)
    // The mutant would return 10 (the dailyAllowance) because it doesn't return the stored remaining value
    expect(remainingAllowance).to.equal(7);
  });
});