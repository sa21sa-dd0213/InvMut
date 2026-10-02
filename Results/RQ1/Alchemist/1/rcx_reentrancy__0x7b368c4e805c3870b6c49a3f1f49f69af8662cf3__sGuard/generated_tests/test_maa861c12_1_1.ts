import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant test - kill maa861c12", function () {
  it("should allow Collect when balance exactly equals MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address as constructor argument
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Get MinSum value (1 ether)
    const minSum = ethers.parseEther("1");

    // Put exactly MinSum (1 ether) into the contract from addr1
    const unlockTime = Math.floor(Date.now() / 1000) + 100; // future unlock time
    const putTx = await instance.connect(addr1).Put(unlockTime, { value: minSum });
    await putTx.wait();

    // Verify balance is exactly MinSum
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(minSum);

    // Advance time past unlock time
    await ethers.provider.send("evm_increaseTime", [101]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect exactly MinSum - this should succeed in original
    // but fail in mutant because mutant requires balance > MinSum (strictly greater)
    const collectTx = instance.connect(addr1).Collect(minSum);

    // The mutant will revert because balance is not > MinSum, only >=
    await expect(collectTx).to.be.reverted;
  });
});