import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mb6ced059 test", function () {
    it("should kill mutant by sending exactly 10 ether and expecting success", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("Roulette");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Send exactly 10 ether to the fallback function
        const tx = await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("10")
        });
        await tx.wait();

        // The transaction should succeed (original accepts 10 ether, mutant reverts)
        // To confirm the mutant is killed, we check the transaction was not reverted
        expect(tx).to.not.be.reverted;
    });
});