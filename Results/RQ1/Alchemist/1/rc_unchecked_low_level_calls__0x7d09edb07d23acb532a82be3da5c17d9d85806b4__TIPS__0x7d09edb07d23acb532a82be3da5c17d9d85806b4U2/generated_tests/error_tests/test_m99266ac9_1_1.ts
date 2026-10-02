import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - wager function", function () {
    it("should detect mutant that records wager as msg.value-1 instead of msg.value", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy with constructor arguments: whale address and bet limit
        const betLimit = ethers.parseEther("1");
        const Factory = await ethers.getContractFactory("PoCGame");
        const instance = await Factory.deploy(owner.address, betLimit);
        await instance.waitForDeployment();
        
        // Owner opens the contract to public
        await (await instance.connect(owner).OpenToThePublic()).wait();
        
        // Player sends exactly betLimit wei to wager
        const wagerTx = await instance.connect(addr1).wager({ value: betLimit });
        await wagerTx.wait();
        
        // Check the stored wager amount - in the original it should equal betLimit
        // In the mutant it will be betLimit - 1
        const storedWager = await instance.wagers(addr1.address);
        expect(storedWager).to.equal(betLimit);
    });
});