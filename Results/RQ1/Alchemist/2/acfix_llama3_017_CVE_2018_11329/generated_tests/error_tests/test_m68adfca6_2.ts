import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant test - ceoAddress changed to address(this)", function () {
    it("should send devFee to contract itself instead of external CEO address when selling drugs", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EtherCartel");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Seed the market first
        await instance.seedMarket(1000);

        // Get free kilos for addr1 so they have drugs to sell
        await instance.connect(addr1).getFreeKilo();

        // Get the contract balance before sell
        const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

        // Wait enough time so drugs are produced (DRUGS_TO_PRODUCE_1KILO = 86400 seconds)
        // Since we cannot wait that long in a test, we'll use a workaround:
        // First collect drugs to convert time-based drugs into claimed drugs
        await instance.connect(addr1).collectDrugs(ethers.ZeroAddress);

        // Now sell the drugs
        const sellTx = await instance.connect(addr1).sellDrugs();
        const receipt = await sellTx.wait();

        // Get the contract balance after sell
        const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());

        // In the mutant, devFee is sent to the contract itself (ceoAddress = address(this))
        // So the contract balance should increase by the fee amount
        // In the original, the fee would go to the external CEO address and contract balance would not increase
        expect(contractBalanceAfter).to.be.gt(contractBalanceBefore);
    });
});