import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
    it("should detect mutant that removes Burn event emission", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("NewIntelTechMedia");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // First, distribute some tokens to owner via NETM() function
        await instance.connect(owner).NETM();

        // Get initial balance of owner
        const initialBalance = await instance.balanceOf(owner.address);
        const burnAmount = ethers.parseEther("1000");

        // Ensure owner has enough balance to burn
        expect(initialBalance).to.be.gte(burnAmount);

        // Call burn function and capture the transaction
        const tx = await instance.connect(owner).burn(burnAmount);
        const receipt = await tx.wait();

        // Check that Burn event was emitted with correct parameters
        await expect(tx)
            .to.emit(instance, "Burn")
            .withArgs(owner.address, burnAmount);
    });
});