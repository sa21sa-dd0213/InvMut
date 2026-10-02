import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant test - instantiateNeuronContract", function () {
    it("should allow owner to call instantiateNeuronContract and revert for non-owners", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy GameItems
        const GameItemsFactory = await ethers.getContractFactory("GameItems");
        const gameItems = await GameItemsFactory.deploy(owner.address, addr1.address);
        await gameItems.waitForDeployment();
        
        // Deploy Neuron contract for the address parameter
        const NeuronFactory = await ethers.getContractFactory("Neuron");
        const neuron = await NeuronFactory.deploy(owner.address, addr1.address, addr1.address);
        await neuron.waitForDeployment();
        
        // Test that owner can call instantiateNeuronContract (should pass in original, fail in mutant)
        await expect(
            gameItems.connect(owner).instantiateNeuronContract(await neuron.getAddress())
        ).to.not.be.reverted;
        
        // Test that non-owner cannot call instantiateNeuronContract (should fail in original, pass in mutant)
        await expect(
            gameItems.connect(addr1).instantiateNeuronContract(await neuron.getAddress())
        ).to.be.reverted;
    });
});