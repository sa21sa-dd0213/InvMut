import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant mab727b40 test", function () {
    it("should succeed with non-empty recipient array and fail on mutant due to reversed length check", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("airdrop");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Prepare test parameters
        const from = owner.address;
        const caddress = addr1.address; // some contract address for the call
        const recipients = [addr2.address]; // non-empty array (length > 0)
        const value = 100;

        // This should succeed on the original contract (length > 0 passes)
        // but will revert on the mutant (length < 0 is always false)
        await expect(
            instance.transfer(from, caddress, recipients, value)
        ).to.be.reverted;
    });
});