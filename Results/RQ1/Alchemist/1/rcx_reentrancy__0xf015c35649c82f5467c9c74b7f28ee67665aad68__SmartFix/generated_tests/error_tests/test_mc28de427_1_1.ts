import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mc28de427 test", function () {
  it("should detect the mutant by checking balance after Collect uses division instead of subtraction", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deposit 10 ether into the bank from user
    const depositAmount = ethers.parseEther("10");
    await bank.connect(user).Put(0, { value: depositAmount });

    // Verify initial balance
    let userBalance = (await bank.Acc(user.address)).balance;
    expect(userBalance).to.equal(depositAmount);

    // Collect 4 ether (less than balance)
    const withdrawAmount = ethers.parseEther("4");
    await bank.connect(user).Collect(withdrawAmount);

    // Check remaining balance - original would be 6 ether, mutant would be 2.5 (truncated to 2)
    userBalance = (await bank.Acc(user.address)).balance;

    // For the original contract, balance should be depositAmount - withdrawAmount = 6 ether
    // For the mutant, balance would be depositAmount / withdrawAmount = 2 ether (integer division)
    expect(userBalance).to.equal(ethers.parseEther("6"));
  });
});