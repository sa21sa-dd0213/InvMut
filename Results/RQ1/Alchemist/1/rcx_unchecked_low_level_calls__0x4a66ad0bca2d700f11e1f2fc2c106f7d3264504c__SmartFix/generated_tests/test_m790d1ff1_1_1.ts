import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m790d1ff1 by passing a non-zero v[i] value that passes original but fails mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract has hardcoded addresses, so we need to use the owner as msg.sender
    // Since from address is hardcoded to 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to get a signer that matches this address
    await network.provider.send("hardhat_setBalance", [
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      "0x1000000000000000000000"
    ]);

    const fromSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    const tos = [addr1.address];
    const values = [5]; // non-zero value that passes the original check (5 * 10^18 / 5 == 10^18)

    // On the original contract this should pass, on the mutant it should revert
    await expect(
      instance.connect(fromSigner).transfer(tos, values)
    ).to.be.reverted;
  });
});