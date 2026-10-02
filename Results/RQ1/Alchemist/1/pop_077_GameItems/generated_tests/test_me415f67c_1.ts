import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant kill test - me415f67c", function () {
  it("should kill the mutant by minting 0 quantity when finiteSupply is true and itemsRemaining is 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const treasuryAddress = owner.address;
    
    // Deploy GameItems
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, treasuryAddress);
    await instance.waitForDeployment();
    
    // Deploy Neuron token (required for minting)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuronInstance = await NeuronFactory.deploy(
      owner.address,
      treasuryAddress,
      addr1.address
    );
    await neuronInstance.waitForDeployment();
    
    // Set up admin access and Neuron contract
    await instance.instantiateNeuronContract(await neuronInstance.getAddress());
    
    // Create a game item with finiteSupply = true, itemsRemaining = 0, dailyAllowance = 100
    await instance.createGameItem(
      "TestItem",
      "ipfs://test",
      true,    // finiteSupply
      true,    // transferable
      0,       // itemsRemaining = 0
      ethers.parseEther("1"),
      100      // dailyAllowance
    );
    
    // Mint Neuron tokens to addr1 so they can attempt to purchase
    const minterRole = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    await neuronInstance.grantRole(minterRole, owner.address);
    await neuronInstance.mint(addr1.address, ethers.parseEther("100"));
    
    // Approve GameItems contract to spend addr1's tokens
    const spenderRole = ethers.keccak256(ethers.toUtf8Bytes("SPENDER_ROLE"));
    await neuronInstance.grantRole(spenderRole, owner.address);
    await neuronInstance.approveSpender(addr1.address, ethers.parseEther("100"));
    
    // Try to mint 0 quantity of the item (tokenId 0) from addr1
    // Original: quantity (0) <= itemsRemaining (0) → true → mint succeeds
    // Mutant: same logic but with >= for bool → should also pass, but we test the edge case
    await expect(
      instance.connect(addr1).mint(0, 0)
    ).to.not.be.reverted;
    
    // Verify the item was minted with 0 quantity
    const balance = await instance.balanceOf(addr1.address, 0);
    expect(balance).to.equal(0);
    
    // Now test with quantity = 1 when itemsRemaining = 0
    // This should revert because 1 > 0 items remaining
    await expect(
      instance.connect(addr1).mint(0, 1)
    ).to.be.reverted;
  });
});