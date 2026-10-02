import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
    it("should revert when non-owner tries to call withdraw", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("SimpleWallet");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund the wallet with some ether first
        const fundTx = await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("1.0")
        });
        await fundTx.wait();

        // Non-owner tries to withdraw all balance
        const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
        await expect(
            instance.connect(addr1).withdraw(contractBalance)
        ).to.be.reverted;
    });
});