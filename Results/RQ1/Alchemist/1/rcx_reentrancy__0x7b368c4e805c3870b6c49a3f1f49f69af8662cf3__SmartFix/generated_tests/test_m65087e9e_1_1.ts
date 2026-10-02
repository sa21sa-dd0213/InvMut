import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m65087e9e - Collect revert removal", function () {
    it("should revert when Collect is called and the external call fails (original behavior), but mutant should not revert", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
                
        // Deploy the Log contract first (required constructor argument for W_WALLET)
        const LogFactory = await ethers.getContractFactory("Log");
        const logInstance = await LogFactory.deploy();
        await logInstance.waitForDeployment();
                
        // Deploy W_WALLET with the Log contract address
        const Factory = await ethers.getContractFactory("W_WALLET");
        const instance = await Factory.deploy(await logInstance.getAddress());
        await instance.waitForDeployment();
                
        // Fund the contract first via Put to create a balance for addr1
        const putAmount = ethers.parseEther("2");
        await instance.connect(addr1).Put(0, { value: putAmount });
                
        // Set MinSum to 0 for testing (or ensure 1 ether is enough)
        // MinSum is 1 ether by default, so we're fine with 2 ether balance
                
        // Create a contract that rejects ether (no receive/fallback)
        // Deploy a simple rejecter contract
        const RejecterFactory = await ethers.getContractFactory("Rejecter");
        const rejecter = await RejecterFactory.deploy();
        await rejecter.waitForDeployment();
                
        // Transfer ownership of the W_WALLET balance to the rejecter contract
        // by calling Collect from the rejecter contract's perspective
        // First, we need to make the rejecter contract have a balance in W_WALLET
        // So put ether from rejecter
        await instance.connect(await ethers.getSigner(await rejecter.getAddress())).Put(0, { 
            value: ethers.parseEther("1") 
        });
                
        // Now call Collect from the rejecter contract - this should revert in original
        // because the rejecter cannot receive ether (no receive/fallback)
        const collectAmount = ethers.parseEther("0.5");
                
        // In the original contract, this should revert because the call to msg.sender fails
        // In the mutant, it should NOT revert (empty else block)
        await expect(
            instance.connect(await ethers.getSigner(await rejecter.getAddress())).Collect(collectAmount)
        ).to.be.reverted;
    });
});

// Deploy a simple rejecter contract that cannot receive ether
contract Rejecter {
    // No receive or fallback function - will reject ether
}