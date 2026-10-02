import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
    it("should revert when non-owner calls sendMoney (kills mutant that removes onlyOwner modifier)", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("SimpleWallet");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Attempt to call sendMoney from non-owner address - should revert in original, pass in mutant
        await expect(
            instance.connect(addr1).sendMoney(
                addr1.address,
                0,
                "0x"
            )
        ).to.be.reverted;
    });
});