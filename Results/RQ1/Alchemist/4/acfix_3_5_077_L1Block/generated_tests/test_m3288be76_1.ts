import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test - m3288be76", function () {
  it("should succeed when called from original DEPOSITOR_ACCOUNT in original, but revert in mutant because mutant changes depositor to address(0)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the contract (constructor takes no arguments per the actual contract)
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Impersonate the original DEPOSITOR_ACCOUNT (0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001)
    const depositorAddress = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";
    await ethers.provider.send("hardhat_impersonateAccount", [depositorAddress]);
    const depositor = await ethers.getSigner(depositorAddress);
    
    // Fund the depositor account so it can pay gas
    await owner.sendTransaction({
      to: depositorAddress,
      value: ethers.parseEther("1.0")
    });

    // Prepare test parameters
    const number = 1;
    const timestamp = 1000;
    const basefee = ethers.parseEther("0.01");
    const hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const sequenceNumber = 0;
    const batcherHash = ethers.hexlify(ethers.randomBytes(32));
    const l1FeeOverhead = 1000;
    const l1FeeScalar = 2000;

    // Attempt to call setL1BlockValues from the original depositor account
    // In the original contract this should succeed; in the mutant it should revert
    // because the mutant changed DEPOSITOR_ACCOUNT to address(0)
    const tx = instance.connect(depositor).setL1BlockValues(
      number,
      timestamp,
      basefee,
      hash,
      sequenceNumber,
      batcherHash,
      l1FeeOverhead,
      l1FeeScalar
    );

    // This call should revert in the mutant since depositor is address(0), not the caller
    await expect(tx).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});