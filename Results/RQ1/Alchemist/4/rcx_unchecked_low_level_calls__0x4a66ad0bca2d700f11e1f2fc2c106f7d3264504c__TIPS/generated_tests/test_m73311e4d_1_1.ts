import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m73311e4d", function () {
  it("should kill mutant that replaces caddress with address(this)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy original contract - no constructor arguments needed for EBU
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the deployed contract address
    const contractAddress = await instance.getAddress();

    // Verify the original caddress is the expected external address
    const originalCaddress = await instance.caddress();
    expect(originalCaddress).to.equal("0x1f844685f7Bf86eFcc0e74D8642c54A257111923");

    // Kill the mutant by proving caddress is NOT address(this) in the original
    // The mutant sets caddress = address(this), so we check this directly
    expect(originalCaddress).to.not.equal(contractAddress);

    // Additional verification: the transfer function in the original calls external address
    // In the mutant, it calls itself, which would always revert since EBU has no transferFrom
    // A successful call on original would require the external contract to exist
    // Since we can't guarantee that, we check the state variable directly

    // This test kills the mutant because:
    // - Original: caddress = 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // - Mutant: caddress = address(this) (the deployed contract address)
    // - The assertion expect(originalCaddress).to.not.equal(contractAddress) passes for original
    // - But fails for mutant because mutant sets caddress = address(this)
  });
});