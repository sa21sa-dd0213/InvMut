import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant detection - safeBatchTransferFrom transferability check", function () {
  it("should revert when batch transferring non-transferable tokens", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, addr1.address);
    await gameItems.waitForDeployment();
    
    // Deploy Neuron contract (required for minting)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(
      owner.address,
      addr1.address,
      addr2.address
    );
    await neuron.waitForDeployment();
    
    // Link Neuron to GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Create a non-transferable game item (tokenId 0)
    await gameItems.createGameItem(
      "NonTransferableItem",
      "ipfs://test",
      true,   // finiteSupply = true
      false,  // transferable = false
      100,    // itemsRemaining
      ethers.parseEther("10"), // itemPrice
      10      // dailyAllowance
    );
    
    // Mint tokens to owner for payment
    await neuron.addMinter(owner.address);
    await neuron.mint(owner.address, ethers.parseEther("1000"));
    
    // Mint the non-transferable item to addr1
    // First set burning address to allow minting
    await gameItems.adjustAdminAccess(owner.address, true);
    await gameItems.setAllowedBurningAddresses(owner.address);
    
    // Mint the item directly through the mint function
    // First make the item transferable temporarily to mint
    await gameItems.adjustTransferability(0, true);
    await gameItems.mint(0, 1);
    
    // Now transfer the item from owner to addr1 so addr1 has it
    await gameItems.safeTransferFrom(owner.address, addr1.address, 0, 1, "0x");
    
    // Make it non-transferable again
    await gameItems.adjustTransferability(0, false);
    
    // Create a second non-transferable item (tokenId 1)
    await gameItems.createGameItem(
      "AnotherNonTransferable",
      "ipfs://test2",
      true,
      false,  // transferable = false
      100,
      ethers.parseEther("5"),
      5
    );
    
    // Mint tokenId 1 to addr1 as well
    await gameItems.adjustTransferability(1, true);
    await gameItems.mint(1, 1);
    await gameItems.safeTransferFrom(owner.address, addr1.address, 1, 1, "0x");
    await gameItems.adjustTransferability(1, false);
    
    // Attempt batch transfer of non-transferable tokens - should revert
    const tokenIds = [0, 1];
    const amounts = [1, 1];
    
    await expect(
      gameItems.connect(addr1).safeBatchTransferFrom(
        addr1.address,
        addr2.address,
        tokenIds,
        amounts,
        "0x"
      )
    ).to.be.reverted;
  });
});