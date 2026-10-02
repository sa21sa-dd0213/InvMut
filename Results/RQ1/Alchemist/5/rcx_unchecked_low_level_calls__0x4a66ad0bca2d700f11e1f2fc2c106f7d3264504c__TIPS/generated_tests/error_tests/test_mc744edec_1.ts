import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mc744edec - return true removal", function () {
  it("should return true when transfer succeeds on original, but mutant returns false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The authorized address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate it since it's a fixed address in the contract
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"],
    });
    const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Fund the authorized address to pay for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1"),
    });

    const tos = [addr1.address];
    const values = [1]; // 1 token (will be multiplied by 10^18 internally)

    const tx = await instance.connect(authorizedSigner).transfer(tos, values);
    const receipt = await tx.wait();

    // On the original contract, this call returns true
    // On the mutant (return true removed), it returns false
    // We can verify by checking the return value from the transaction
    const result = await instance.connect(authorizedSigner).transfer.staticCall(tos, values);
    expect(result).to.equal(true);
  });
});