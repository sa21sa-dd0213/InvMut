import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge - Kill mutant m02208262", function () {
    it("should transfer 2 ether when correct guess is made, but mutant with false condition never transfers", async function () {
        const [owner, user] = await ethers.getSigners();
        
        // Deploy contract with enough ether to cover potential transfer
        const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
        const instance = await Factory.deploy({ value: ethers.parseEther("3") });
        await instance.waitForDeployment();

        // Set the next block's hash to a known value we can predict
        const predictedHash = ethers.keccak256(ethers.toUtf8Bytes("predicted"));
        await ethers.provider.send("evm_setNextBlockHash", [predictedHash]);

        // Lock in the guess with the predicted hash
        await instance.connect(user).lockInGuess(predictedHash, { value: ethers.parseEther("1") });

        // Mine the block - this will use the hash we set
        await ethers.provider.send("evm_mine", []);

        // Record contract balance before settlement
        const contractBalBeforeSettle = await ethers.provider.getBalance(instance.target);
        
        // Settle the guess
        await instance.connect(user).settle();
        
        // Record contract balance after settlement
        const contractBalAfterSettle = await ethers.provider.getBalance(instance.target);

        // In the original contract: contract balance decreases by 2 ether (from 3 to 1)
        // In the mutant: contract balance stays the same (3)
        // This test will pass on original and fail on mutant
        expect(contractBalAfterSettle).to.equal(contractBalBeforeSettle - ethers.parseEther("2"));
    });
});