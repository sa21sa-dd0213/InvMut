import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m0e5b8bc9 detection", function () {
    it("should detect the mutant by verifying the logged value matches msg.value exactly", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MONEY_BOX");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Initialize the contract
        await instance.connect(owner).Initialized();
        
        // Set MinSum to 0 so Collect can work
        await instance.connect(owner).SetMinSum(0);

        // Deploy a Log contract to capture events
        const LogFactory = await ethers.getContractFactory("Log");
        const logInstance = await LogFactory.deploy();
        await logInstance.waitForDeployment();

        // Set the Log contract address
        await instance.connect(owner).SetLogFile(await logInstance.getAddress());

        // Send exactly 1 ether via Put
        const amount = ethers.parseEther("1");
        await instance.connect(addr1).Put(0, { value: amount });

        // Check the last message in Log's History - it should have the exact amount sent
        const historyLength = await logInstance.History.length;
        const lastMessage = await logInstance.History(historyLength - 1n);
        
        // In the mutant, the logged Val will be msg.value + 1, so it will be 1 wei more than expected
        expect(lastMessage.Val).to.equal(amount);
    });
});