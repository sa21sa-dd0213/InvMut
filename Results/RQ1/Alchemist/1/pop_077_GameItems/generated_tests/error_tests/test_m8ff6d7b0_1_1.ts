import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - Kill mutant m8ff6d7b0", function () {
    it("should revert when user has insufficient NRN balance for mint", async function () {
        const [owner, buyer, treasury] = await ethers.getSigners();
        
        // Deploy Neuron contract
        const NeuronFactory = await ethers.getContractFactory("Neuron");
        const neuron = await NeuronFactory.deploy(owner.address, treasury.address, owner.address);
        await neuron.waitForDeployment();
        
        // Deploy GameItems contract
        const GameItemsFactory = await ethers.getContractFactory("GameItems");
        const gameItems = await GameItemsFactory.deploy(owner.address, treasury.address);
        await gameItems.waitForDeployment();
        
        // Setup: Create a game item with price > 0
        await gameItems.connect(owner).adjustAdminAccess(owner.address, true);
        await gameItems.connect(owner).createGameItem(
            "TestItem",
            "ipfs://test",
            false,  // finiteSupply = false
            true,   // transferable = true
            100,    // itemsRemaining
            ethers.parseEther("10"), // itemPrice = 10 NRN
            100     // dailyAllowance
        );
        
        // Connect Neuron to GameItems
        await gameItems.connect(owner).instantiateNeuronContract(await neuron.getAddress());
        
        // Buyer has no NRN tokens (balance = 0)
        // Attempt to mint 1 item costing 10 NRN with 0 balance
        // Original contract should revert with "Not enough NRN for purchase"
        // Mutant would allow this without revert
        await expect(
            gameItems.connect(buyer).mint(0, 1)
        ).to.be.revertedWith("Not enough NRN for purchase");
    });
});