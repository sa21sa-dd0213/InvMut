import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test", function () {
    it("should detect the mutant by calling airDrop from an address with existing balance", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy Bank contract first (required by supportsToken modifier)
        const BankFactory = await ethers.getContractFactory("Bank");
        const bank = await BankFactory.deploy();
        await bank.waitForDeployment();
        
        // Deploy ModifierEntrancy with no constructor arguments
        const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
        const instance = await ModifierEntrancyFactory.deploy();
        await instance.waitForDeployment();
        
        // Simulate a user (addr1) getting tokens through some other means to bypass hasNoBalance
        // Since the contract has no other functions, we directly manipulate state via setStorageAt
        // Set addr1's tokenBalance to 10 (storage slot 0 for mapping with key addr1)
        const slot = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
                ["address", "uint256"],
                [addr1.address, 0]
            )
        );
        await ethers.provider.send("hardhat_setStorageAt", [
            await instance.getAddress(),
            slot,
            ethers.zeroPadValue("0x0a", 32) // 10 in hex
        ]);
        
        // Now try to call airDrop from addr1 - the hasNoBalance modifier will fail
        // This call should revert because addr1 has a balance of 10
        await expect(
            instance.connect(addr1).airDrop()
        ).to.be.reverted;
    });
});