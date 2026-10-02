import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant kill test - mdba8641d", function () {
  it("should detect mutant that removes finiteSupply check when decrementing itemsRemaining", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const treasuryAddress = owner.address;
    
    // Deploy GameItems with required constructor arguments
    const Factory = await ethers.getContractFactory("GameItems");
    const gameItems = await Factory.deploy(owner.address, treasuryAddress);
    await gameItems.waitForDeployment();

    // Deploy Neuron contract for NRN payments
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, treasuryAddress, addr1.address);
    await neuron.waitForDeployment();

    // Setup: make owner admin and instantiate Neuron contract
    await gameItems.instantiateNeuronContract(await neuron.getAddress());

    // Create a game item with infinite supply (finiteSupply = false)
    // This item should NOT have its itemsRemaining decremented when minted
    const itemName = "Infinite Item";
    const tokenURI = "ipfs://test";
    const finiteSupply = false;
    const transferable = true;
    const itemsRemaining = 100;
    const itemPrice = ethers.parseEther("10");
    const dailyAllowance = 5;

    await gameItems.createGameItem(
      itemName,
      tokenURI,
      finiteSupply,
      transferable,
      itemsRemaining,
      itemPrice,
      dailyAllowance
    );

    const tokenId = 0;

    // Give addr1 some NRN tokens and approve GameItems to spend them
    const mintAmount = ethers.parseEther("1000");
    await neuron.mint(addr1.address, mintAmount);
    
    // Add addr1 as spender so GameItems can spend their NRN
    await neuron.addSpender(addr1.address);

    // Have addr1 approve the GameItems contract to spend their NRN
    await neuron.connect(addr1).approve(await gameItems.getAddress(), mintAmount);

    // Get initial itemsRemaining for the infinite supply item
    const initialRemaining = await gameItems.remainingSupply(tokenId);
    expect(initialRemaining).to.equal(100);

    // Mint 1 item for addr1 - this should succeed for infinite supply items
    const quantity = 1;
    await gameItems.connect(addr1).mint(tokenId, quantity);

    // Check itemsRemaining - for infinite supply (finiteSupply = false),
    // it should NOT have decreased (original behavior)
    // In the mutant, itemsRemaining WILL decrease because the condition is always true
    const remainingAfterMint = await gameItems.remainingSupply(tokenId);
    
    // If the mutant is present, remainingAfterMint will be 99 (incorrectly decreased)
    // If original code, remainingAfterMint will still be 100 (unchanged for infinite supply)
    expect(remainingAfterMint).to.equal(100,
      "Mutant detected: itemsRemaining decreased for infinite supply item"
    );
  });
});