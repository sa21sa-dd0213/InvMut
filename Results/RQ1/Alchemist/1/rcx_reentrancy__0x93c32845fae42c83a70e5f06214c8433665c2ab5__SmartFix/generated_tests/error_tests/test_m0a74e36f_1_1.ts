import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test - m0a74e36f", function () {
  it("should succeed on Put with non-zero msg.value for original, but mutant reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with Log address
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const instance = await XWalletFactory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // Test: Call Put with non-zero value (e.g., 1 ether) from addr1
    // Original contract should succeed; mutant will revert
    const depositAmount = ethers.parseEther("1");

    // The test expects success (no revert) for the original behavior
    await expect(
      instance.connect(addr1).Put(0, { value: depositAmount })
    ).to.not.be.reverted;

    // Additionally verify the balance increased correctly
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
  });
});