import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF reference (ethers v6; deploy may require constructor arguments)", function () {
    it("should revert when non-CFO calls onlyCaller-protected function (kill mutant m04036820)", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("DCF");
        const liquidityReceiveAddress = addr2.address;
        const instance = await Factory.deploy(liquidityReceiveAddress);
        await instance.waitForDeployment();

        // Set the CFO to be the owner
        await instance.connect(owner).setCaller(owner.address);

        // Try to call a function protected by onlyCaller from a non-CFO address (addr1)
        // The function distributeToken() should revert because addr1 is not the CFO
        await expect(
            instance.connect(addr1).distributeToken()
        ).to.be.revertedWith("onlyCaller");
    });
});