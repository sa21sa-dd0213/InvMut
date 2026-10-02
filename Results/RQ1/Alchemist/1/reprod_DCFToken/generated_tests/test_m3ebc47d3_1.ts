import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - setBlack without onlyCaller", function () {
    it("should revert when non-cfo calls setBlack in original, but mutant allows it", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy DCF with constructor argument (liquidityReceiveAddress)
        const DCF = await ethers.getContractFactory("DCF");
        const instance = await DCF.deploy(addr2.address);
        await instance.waitForDeployment();
        
        // Set the cfo to be addr1
        await instance.connect(owner).setCaller(addr1.address);
        
        // Attempt to call setBlack from an unauthorized address (addr2)
        // In the original contract, this should revert because onlyCaller modifier checks that msg.sender == cfo
        // In the mutant, the modifier is removed, so the call will succeed
        await expect(
            instance.connect(addr2).setBlack(addr1.address, true)
        ).to.be.revertedWith("onlyCaller");
    });
});