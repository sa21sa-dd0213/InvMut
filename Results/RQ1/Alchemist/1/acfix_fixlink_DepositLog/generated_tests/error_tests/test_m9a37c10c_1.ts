import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant detection - m9a37c10c", function () {
    it("should detect removal of approvedLoggers lookup in approvedToLog", async function () {
        const [owner, approvedLogger, unauthorized] = await ethers.getSigners();
        
        // Deploy the contract - no constructor arguments needed
        const Factory = await ethers.getContractFactory("DepositLog");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Step 1: Owner approves a logger
        await instance.connect(owner).setApprovedLogger(approvedLogger.address, true);
        
        // Step 2: Verify the approved logger can successfully log and event is emitted
        const tx = await instance.connect(approvedLogger).logFunded();
        const receipt = await tx.wait();
        
        // Step 3: Verify event was emitted (original contract would emit, mutant would revert)
        expect(receipt).to.not.be.undefined;
        expect(tx).to.emit(instance, "Funded").withArgs(approvedLogger.address, ethers.anyValue);
        
        // Step 4: Verify unauthorized address cannot log
        await expect(
            instance.connect(unauthorized).logFunded()
        ).to.be.reverted;
    });
});