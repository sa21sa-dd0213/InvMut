import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - kill mutant md1aa2503", function () {
  it("should revert when batch transferring tokens that include a non-transferable token", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy Neuron token first (needed for minting GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuronInstance = await NeuronFactory.deploy(
      owner.address,
      owner.address,
      owner.address
    );
    await neuronInstance.waitForDeployment();
    
    // Deploy GameItems
    const Factory = await ethers.getContractFactory("GameItems");
    const gameItems = await Factory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuronInstance.getAddress());
    
    // Create two game items: one transferable (tokenId 0) and one non-transferable (tokenId 1)
    await gameItems.createGameItem(
      "Transferable Item",
      "ipfs://token0",
      true,   // finiteSupply
      true,   // transferable
      100,    // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      10      // dailyAllowance
    );
    
    await gameItems.createGameItem(
      "Non-Transferable Item",
      "ipfs://token1",
      true,   // finiteSupply
      false,  // NOT transferable
      100,    // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      10      // dailyAllowance
    );
    
    // Give owner enough NRN to mint tokens
    await neuronInstance.mint(owner.address, ethers.parseEther("1000"));
    
    // Mint tokens to owner for both items
    // First, set daily allowance replenish time to past so we can mint
    // Mint token 0 (transferable)
    await gameItems.mint(0, 1);
    // Mint token 1 (non-transferable)
    await gameItems.mint(1, 1);
    
    // Now attempt to batch transfer both tokens from owner to addr1
    // This should revert because token 1 is not transferable
    await expect(
      gameItems.safeBatchTransferFrom(
        owner.address,
        addr1.address,
        [0, 1],  // ids array with non-transferable token
        [1, 1],  // amounts
        "0x"     // empty data
      )
    ).to.be.reverted;
    
    // Verify that tokens were NOT transferred (balances unchanged)
    expect(await gameItems.balanceOf(owner.address, 0)).to.equal(1);
    expect(await gameItems.balanceOf(owner.address, 1)).to.equal(1);
    expect(await gameItems.balanceOf(addr1.address, 0)).to.equal(0);
    expect(await gameItems.balanceOf(addr1.address, 1)).to.equal(0);
  });
});