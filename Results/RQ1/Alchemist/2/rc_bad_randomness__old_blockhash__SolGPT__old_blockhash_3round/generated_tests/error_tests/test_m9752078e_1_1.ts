import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
    it("should revert on first lockInGuess call from a fresh address when mutant changes == to !=", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
        const instance = await Factory.deploy({ value: ethers.parseEther("1") });
        await instance.waitForDeployment();

        // Attempt to call lockInGuess for the first time from addr1 (no previous guess)
        // In the original contract this would succeed, but the mutant requires guesses[addr1].block != 0
        // Since it's 0, the transaction should revert
        const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
        await expect(
            instance.connect(addr1).lockInGuess(dummyHash, { value: ethers.parseEther("1") })
        ).to.be.reverted;
    });
});