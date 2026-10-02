import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m05a3b431 test", function () {
    it("should detect mutant that changes >= to > in Collect condition", async function () {
        const [owner, user] = await ethers.getSigners();
        const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
        const moneyBox = await MoneyBoxFactory.deploy();
        await moneyBox.waitForDeployment();

        // Set up the contract: initialize and set MinSum to 0
        await moneyBox.connect(owner).SetMinSum(0);
        await moneyBox.connect(owner).Initialized();

        // User deposits 1 ether
        const depositAmount = ethers.parseEther("1.0");
        await moneyBox.connect(user).Put(0, { value: depositAmount });

        // Fast forward time to ensure unlock condition is met
        await ethers.provider.send("evm_increaseTime", [1]);
        await ethers.provider.send("evm_mine", []);

        // User tries to collect exactly their balance (1 ether)
        // In the original contract this should succeed, in the mutant it should revert
        await expect(
            moneyBox.connect(user).Collect(depositAmount)
        ).to.be.reverted;
    });
});