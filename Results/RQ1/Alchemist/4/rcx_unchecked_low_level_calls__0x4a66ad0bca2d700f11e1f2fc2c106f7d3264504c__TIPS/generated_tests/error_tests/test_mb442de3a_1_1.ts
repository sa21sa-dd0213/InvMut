import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mb442de3a - authorization check inversion", function () {
  it("should revert when called from the authorized address due to mutant's != check", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy EBU (no constructor arguments needed based on contract code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The authorized address is the hardcoded address in the contract
    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";

    // Impersonate the authorized address
    await ethers.provider.send("hardhat_impersonateAccount", [authorizedAddress]);
    const authorizedSigner = await ethers.getSigner(authorizedAddress);

    // Fund the authorized address with some ETH for gas
    await owner.sendTransaction({
      to: authorizedAddress,
      value: ethers.parseEther("1.0")
    });

    // Prepare test inputs: one recipient and one value
    const recipients = ["0x1f844685f7Bf86eFcc0e74D8642c54A257111923"];
    const values = [1]; // 1 token

    // Call transfer from the authorized address - should revert on mutant
    await expect(
      instance.connect(authorizedSigner).transfer(recipients, values)
    ).to.be.reverted;
  });
});