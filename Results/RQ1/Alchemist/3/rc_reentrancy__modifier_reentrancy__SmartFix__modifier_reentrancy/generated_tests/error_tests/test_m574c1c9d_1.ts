import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy - Kill mutant m574c1c9d (sha256 vs keccak256)", function () {
    it("should revert when calling airDrop() because sha256 hash does not match keccak256 hash from Bank.supportsToken()", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy Bank contract first
        const BankFactory = await ethers.getContractFactory("Bank");
        const bank = await BankFactory.deploy();
        await bank.waitForDeployment();
        
        // Deploy ModifierEntrancy (no constructor arguments needed)
        const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
        const instance = await ModifierEntrancyFactory.deploy();
        await instance.waitForDeployment();
        
        // Call airDrop() from addr1 (who has zero token balance and is not the owner)
        // In the original, this would succeed because keccak256 hashes match
        // In the mutant, this should revert because sha256 != keccak256
        await expect(
            instance.connect(addr1).airDrop()
        ).to.be.reverted;
    });
});