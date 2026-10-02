import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant detection - mint function", function () {
  it("should detect mutant that replaces 'if (success)' with 'if (false)' by verifying tokens are minted after successful payment", async function () {
    const [owner, user, treasury] = await ethers.getSigners();
    
    // Deploy Neuron token first (needed for payments)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, treasury.address, owner.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems with required constructor args: ownerAddress, treasuryAddress_
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, treasury.address);
    await gameItems.waitForDeployment();
    
    // Setup: instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Create a game item with finite supply, transferable, and price
    const itemName = "TestItem";
    const tokenURI = "ipfs://test";
    const finiteSupply = true;
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
    
    // Give user some NRN tokens and approve GameItems to spend them
    const mintAmount = ethers.parseEther("100");
    await neuron.mint(user.address, mintAmount);
    
    const purchaseQuantity = 2;
    const totalPrice = itemPrice * BigInt(purchaseQuantity);
    
    // User must approve GameItems to spend NRN on their behalf
    // First, need to make user a spender via GameItems' approveSpender mechanism
    await gameItems.connect(owner).addSpender(user.address);
    
    // User approves GameItems contract to spend their NRN
    await neuron.connect(user).approve(await gameItems.getAddress(), totalPrice);
    
    // Also need to set up the allowance in GameItems
    // User needs spender role to call approveSpender on GameItems
    // Actually, let's use the transferFrom flow: user approves Neuron to let GameItems transfer
    // The mint function calls _neuronInstance.approveSpender(msg.sender, price) then transferFrom
    // So user needs to have approved Neuron first, then GameItems will approve itself as spender
    
    // Simpler approach: Give user enough daily allowance by manipulating time
    // The mint function checks dailyAllowanceReplenishTime and allowanceRemaining
    
    // Since dailyAllowanceReplenishTime starts at 0, and block.timestamp > 0, the first check passes
    // But allowanceRemaining starts at 0, so we need to ensure the replenish logic runs
    
    // Check initial balance
    const initialBalance = await gameItems.balanceOf(user.address, tokenId);
    expect(initialBalance).to.equal(0);
    
    // Execute mint
    await gameItems.connect(user).mint(tokenId, purchaseQuantity);
    
    // Verify tokens were minted (this should fail on the mutant where if(false) prevents minting)
    const finalBalance = await gameItems.balanceOf(user.address, tokenId);
    expect(finalBalance).to.equal(BigInt(purchaseQuantity));
    
    // Additional verification: check that BoughtItem event was emitted (optional but good)
    await expect(gameItems.connect(user).mint(tokenId, 1))
      .to.emit(gameItems, "BoughtItem")
      .withArgs(user.address, tokenId, 1);
  });
});