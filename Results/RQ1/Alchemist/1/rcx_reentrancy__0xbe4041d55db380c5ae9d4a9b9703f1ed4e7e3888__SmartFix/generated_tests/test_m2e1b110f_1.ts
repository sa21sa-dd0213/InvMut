import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test for m2e1b110f", function () {
  it("should revert when Collect external call fails (mutant silently ignores failure)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy Log contract first (MONEY_BOX references it)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MONEY_BOX
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBox = await MoneyBoxFactory.deploy();
    await moneyBox.waitForDeployment();

    // Initialize the contract (set LogFile and MinSum, then mark initialized)
    await (await moneyBox.connect(owner).SetLogFile(await logInstance.getAddress())).wait();
    await (await moneyBox.connect(owner).SetMinSum(ethers.parseEther("0.1"))).wait();
    await (await moneyBox.connect(owner).Initialized()).wait();

    // Fund the attacker's account in MONEY_BOX
    const depositAmount = ethers.parseEther("1");
    await (await moneyBox.connect(attacker).Put(0, { value: depositAmount })).wait();

    // Deploy a malicious receiver contract that reverts on receiving Ether
    const RevertReceiverFactory = await ethers.getContractFactory(
      "contract RevertReceiver { receive() external payable { revert('receive failed'); } }"
    );
    const revertReceiver = await RevertReceiverFactory.deploy();
    await revertReceiver.waitForDeployment();

    // Attempt to call Collect from the attacker, sending funds to the revert receiver
    // This should revert in the original contract but succeed in the mutant
    await expect(
      moneyBox.connect(attacker).Collect(ethers.parseEther("0.5"), {
        to: await revertReceiver.getAddress()
      })
    ).to.be.revertedWith("receive failed"); // Original would revert; mutant would not revert
  });
});