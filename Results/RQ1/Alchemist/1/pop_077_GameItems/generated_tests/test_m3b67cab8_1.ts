import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - Kill mutant m3b67cab8 (tokenId <= _itemCount)", function () {
  it("should revert when minting token with ID equal to _itemCount (original strict < check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy GameItems with required constructor arguments
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Deploy Neuron contract (required for minting)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, addr1.address);
    await neuron.waitForDeployment();
    
    // Link Neuron contract to GameItems
    await gameItems.connect(owner).instantiateNeuronContract(await neuron.getAddress());
    
    // Create one game item (tokenId = 0)
    await gameItems.connect(owner).createGameItem(
      "Test Item",
      "https://test.uri",
      false,  // finiteSupply = false (unlimited)
      true,   // transferable = true
      1000,   // itemsRemaining
      ethers.parseEther("1"),  // itemPrice
      100     // dailyAllowance
    );
    
    // _itemCount should now be 1
    // Token IDs 0 is valid (tokenId < _itemCount => 0 < 1 = true)
    // Token ID 1 should revert (tokenId < _itemCount => 1 < 1 = false in original)
    // But mutant allows tokenId <= _itemCount => 1 <= 1 = true
    
    // Fund addr1 with enough NRN to attempt purchase
    await neuron.connect(owner).transfer(addr1.address, ethers.parseEther("100"));
    
    // Give addr1 approval to spend NRN
    await neuron.connect(owner).addSpender(addr1.address);
    await neuron.connect(addr1).approveSpender(await gameItems.getAddress(), ethers.parseEther("100"));
    
    // Attempt to mint token with ID = _itemCount (1), which should revert in original
    // Original: require(tokenId < _itemCount) -> require(1 < 1) -> false -> revert
    // Mutant: require(tokenId <= _itemCount) -> require(1 <= 1) -> true -> passes
    await expect(
      gameItems.connect(addr1).mint(1, 1)
    ).to.be.reverted;
  });
});