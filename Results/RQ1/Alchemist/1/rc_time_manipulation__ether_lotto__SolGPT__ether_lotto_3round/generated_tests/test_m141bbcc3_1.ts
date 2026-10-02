import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m141bbcc3", function () {
    it("should revert when sending value less than TICKET_AMOUNT (10 wei)", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EtherLotto");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Attempt to play with only 5 wei (less than TICKET_AMOUNT of 10)
        await expect(
            instance.connect(addr1).play({ value: 5 })
        ).to.be.reverted;
    });
});